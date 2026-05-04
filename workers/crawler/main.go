package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"
)

// ---- Crawl runner ----

func processJob(ctx context.Context, jobID string) {
	j, err := dbGetJob(jobID)
	if err != nil {
		log.Printf("[job %s] load failed: %v", jobID, err)
		dbSetError(jobID, err.Error())
		return
	}

	dbSetStatus(jobID, StatusRunning)
	publishProgress(ctx, jobID, ProgressEvent{Type: "running"})

	scraped, skipped, total := 0, 0, 0

	for _, site := range j.Sites {
		if scraped >= j.MaxProducts {
			break
		}

		sitemaps, err := getProductSitemaps(site)
		if err != nil {
			log.Printf("[job %s] sitemap error for %s: %v", jobID, site, err)
			continue
		}

		shopName := shopLabel(site)

		for _, sm := range sitemaps {
			if scraped >= j.MaxProducts {
				break
			}

			entries, err := getProductURLs(sm)
			if err != nil {
				log.Printf("[job %s] sitemap parse error: %v", jobID, err)
				continue
			}

			total += len(entries)
			dbUpdateProgress(jobID, scraped, skipped, total)
			publishProgress(ctx, jobID, ProgressEvent{
				Type: "progress", Scraped: scraped, Skipped: skipped, Total: total,
			})

			for _, entry := range entries {
				if scraped >= j.MaxProducts {
					break
				}

				p, err := scrapeProduct(entry, shopName)
				if err != nil {
					log.Printf("[job %s] skip %s: %v", jobID, entry.Loc, err)
					skipped++
					dbUpdateProgress(jobID, scraped, skipped, total)
					continue
				}

				pid, err := dbInsertProduct(jobID, p)
				if err != nil {
					log.Printf("[job %s] db insert: %v", jobID, err)
					continue
				}
				dbInsertVariants(pid, p.Variants)

				scraped++
				dbUpdateProgress(jobID, scraped, skipped, total)
				publishProgress(ctx, jobID, ProgressEvent{
					Type: "progress", Scraped: scraped, Skipped: skipped, Total: total, Product: p,
				})
			}
		}
	}

	dbSetStatus(jobID, StatusDone)
	publishProgress(ctx, jobID, ProgressEvent{
		Type: "done", Scraped: scraped, Skipped: skipped, Total: total,
	})
	log.Printf("[job %s] done: %d scraped, %d skipped", jobID, scraped, skipped)
}

// workerLoop pulls job IDs from the Redis queue and processes each in its own goroutine.
func workerLoop(ctx context.Context) {
	for {
		jobID, err := dequeueJob(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("queue error: %v — retrying in 2s", err)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Printf("dequeued job %s", jobID)
		go processJob(ctx, jobID)
	}
}

// ---- HTTP helpers ----

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

// ---- Job handlers ----

func handleCreateJob(w http.ResponseWriter, r *http.Request) {
	var req StartJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if len(req.Sites) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "sites required"})
		return
	}
	if req.MaxProducts <= 0 {
		req.MaxProducts = 500
	}

	now := time.Now()
	j := &Job{
		ID:          genID(),
		Sites:       req.Sites,
		MaxProducts: req.MaxProducts,
		Status:      StatusQueued,
		Products:    []Product{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := dbCreateJob(j); err != nil {
		log.Printf("db create job: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	if err := enqueueJob(r.Context(), j.ID); err != nil {
		log.Printf("enqueue: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "queue error"})
		return
	}

	writeJSON(w, http.StatusCreated, j)
}

func handleGetJob(w http.ResponseWriter, r *http.Request, id string) {
	j, err := dbGetJob(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "job not found"})
		return
	}
	j.Products, _ = dbGetProducts(id)
	writeJSON(w, http.StatusOK, j)
}

func handleListJobs(w http.ResponseWriter, r *http.Request) {
	list, err := dbListJobs()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*Job{}
	}
	writeJSON(w, http.StatusOK, list)
}

// handleJobEvents streams Redis pub/sub for a job as Server-Sent Events.
func handleJobEvents(w http.ResponseWriter, r *http.Request, id string) {
	j, err := dbGetJob(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "job not found"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "streaming unsupported"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Send a snapshot of current state immediately so the client isn't blank.
	snap, _ := json.Marshal(ProgressEvent{
		Type:    "state",
		Scraped: j.Progress.Scraped,
		Skipped: j.Progress.Skipped,
		Total:   j.Progress.Total,
	})
	fmt.Fprintf(w, "data: %s\n\n", snap)
	flusher.Flush()

	// Already finished — no need to subscribe.
	if j.Status == StatusDone || j.Status == StatusFailed {
		done, _ := json.Marshal(ProgressEvent{Type: string(j.Status)})
		fmt.Fprintf(w, "data: %s\n\n", done)
		flusher.Flush()
		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	sub := rdb.Subscribe(ctx, progressChannel(id))
	defer sub.Close()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-heartbeat.C:
			fmt.Fprintf(w, ": ping\n\n")
			flusher.Flush()
		case msg, ok := <-sub.Channel():
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg.Payload)
			flusher.Flush()

			var ev ProgressEvent
			if json.Unmarshal([]byte(msg.Payload), &ev) == nil && (ev.Type == "done" || ev.Type == "error") {
				return
			}
		}
	}
}

// ---- Router ----

func handleJobs(w http.ResponseWriter, r *http.Request) {
	// /jobs, /jobs/, /jobs/<id>, /jobs/<id>/events
	tail := strings.TrimPrefix(r.URL.Path, "/jobs")
	tail = strings.TrimPrefix(tail, "/")

	switch {
	case tail == "" || tail == "/":
		switch r.Method {
		case http.MethodGet:
			handleListJobs(w, r)
		case http.MethodPost:
			handleCreateJob(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}

	case strings.HasSuffix(tail, "/events"):
		id := strings.TrimSuffix(tail, "/events")
		handleJobEvents(w, r, id)

	default:
		// tail is the job ID
		if r.Method == http.MethodGet {
			handleGetJob(w, r, tail)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
	}
}

// ---- Main ----

func main() {
	ctx := context.Background()

	if err := initDB(); err != nil {
		log.Fatalf("postgres: %v", err)
	}
	log.Println("postgres: connected")

	if err := initRedis(); err != nil {
		log.Fatalf("redis: %v", err)
	}
	log.Println("redis: connected")

	go workerLoop(ctx)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", cors(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}))
	mux.HandleFunc("/jobs", cors(handleJobs))
	mux.HandleFunc("/jobs/", cors(handleJobs))

	addr := ":8080"
	log.Printf("crawler worker listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func genID() string {
	b := make([]byte, 8)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(256))
		b[i] = byte(n.Int64())
	}
	return fmt.Sprintf("%x", b)
}
