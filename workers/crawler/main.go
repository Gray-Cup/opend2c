package main

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"
)

const defaultBatchSize      = 50
const defaultBatchPauseSecs = 120

// ---- Crawl runner ----

type productEntry struct {
	entry    URLEntry
	shopName string
}

// collectEntries resolves all product URLs from either a direct sitemap URL or
// by discovering sitemaps from each base site URL.
func collectEntries(j *Job) ([]productEntry, error) {
	var all []productEntry

	if j.SitemapURL != "" {
		entries, err := getProductURLs(j.SitemapURL)
		if err != nil {
			return nil, fmt.Errorf("fetch sitemap %s: %w", j.SitemapURL, err)
		}
		shop := shopLabel(j.SitemapURL)
		for _, e := range entries {
			all = append(all, productEntry{entry: e, shopName: shop})
		}
		return all, nil
	}

	for _, site := range j.Sites {
		sitemaps, err := getProductSitemaps(site)
		if err != nil {
			log.Printf("[collect] sitemap index error for %s: %v", site, err)
			continue
		}
		shop := shopLabel(site)
		for _, sm := range sitemaps {
			entries, err := getProductURLs(sm)
			if err != nil {
				log.Printf("[collect] sitemap parse error %s: %v", sm, err)
				continue
			}
			for _, e := range entries {
				all = append(all, productEntry{entry: e, shopName: shop})
			}
		}
	}
	return all, nil
}

func processJob(ctx context.Context, jobID string) {
	j, err := dbGetJob(jobID)
	if err != nil {
		log.Printf("[job %s] load failed: %v", jobID, err)
		dbSetError(jobID, err.Error())
		return
	}

	dbSetStatus(jobID, StatusRunning)
	publishProgress(ctx, jobID, ProgressEvent{Type: "running"})

	// Resolve batch config with defaults
	batchSize := j.BatchSize
	if batchSize <= 0 {
		batchSize = defaultBatchSize
	}
	batchPause := time.Duration(j.BatchPauseSecs) * time.Second
	if j.BatchPauseSecs <= 0 {
		batchPause = defaultBatchPauseSecs * time.Second
	}

	// Collect all product URLs upfront
	allEntries, err := collectEntries(j)
	if err != nil {
		log.Printf("[job %s] collect entries failed: %v", jobID, err)
		dbSetError(jobID, err.Error())
		return
	}

	// Apply MaxProducts cap
	if j.MaxProducts > 0 && len(allEntries) > j.MaxProducts {
		allEntries = allEntries[:j.MaxProducts]
	}

	total := len(allEntries)
	totalBatches := (total + batchSize - 1) / batchSize
	if totalBatches == 0 {
		totalBatches = 1
	}

	log.Printf("[job %s] %d URLs across %d batches (pause %v)", jobID, total, totalBatches, batchPause)

	dbUpdateProgress(jobID, 0, 0, total)
	publishProgress(ctx, jobID, ProgressEvent{
		Type: "progress", Total: total, TotalBatches: totalBatches,
	})

	scraped, skipped := 0, 0

	for batchIdx := 0; batchIdx < totalBatches; batchIdx++ {
		if batchIdx > 0 {
			msg := fmt.Sprintf("Pausing %v before batch %d/%d…", batchPause, batchIdx+1, totalBatches)
			log.Printf("[job %s] %s", jobID, msg)
			publishProgress(ctx, jobID, ProgressEvent{
				Type: "progress", Scraped: scraped, Skipped: skipped, Total: total,
				Batch: batchIdx, TotalBatches: totalBatches, Message: msg,
			})
			time.Sleep(batchPause)
		}

		start := batchIdx * batchSize
		end := start + batchSize
		if end > len(allEntries) {
			end = len(allEntries)
		}
		batch := allEntries[start:end]

		log.Printf("[job %s] batch %d/%d: scraping %d URLs", jobID, batchIdx+1, totalBatches, len(batch))

		var batchProds []*Product

		for _, pe := range batch {
			p, err := scrapeProduct(pe.entry, pe.shopName)
			if err != nil {
				log.Printf("[job %s] skip %s: %v", jobID, pe.entry.Loc, err)
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

			batchProds = append(batchProds, p)
			scraped++

			dbUpdateProgress(jobID, scraped, skipped, total)
			publishProgress(ctx, jobID, ProgressEvent{
				Type: "progress", Scraped: scraped, Skipped: skipped, Total: total,
				Batch: batchIdx + 1, TotalBatches: totalBatches,
				Product: p,
			})
		}

		log.Printf("[job %s] batch %d/%d done: %d scraped this batch", jobID, batchIdx+1, totalBatches, len(batchProds))

		// Sync this batch's products to the console immediately
		if len(batchProds) > 0 {
			syncBatchToConsole(j, batchProds, scraped, total, batchIdx+1 == totalBatches)
		}
	}

	dbSetStatus(jobID, StatusDone)
	publishProgress(ctx, jobID, ProgressEvent{
		Type: "done", Scraped: scraped, Skipped: skipped, Total: total,
	})
	log.Printf("[job %s] done: %d scraped, %d skipped", jobID, scraped, skipped)
}

// syncBatchToConsole pushes one batch of scraped products to the console.
// When done=true it also signals the console to mark the sitemap as done.
func syncBatchToConsole(j *Job, products []*Product, scraped, total int, done bool) {
	// BACKEND_SYNC_URL takes priority (Zerops internal); falls back to CONSOLE_URL for legacy deploys
	syncURL := os.Getenv("BACKEND_SYNC_URL")
	if syncURL == "" {
		consoleURL := os.Getenv("CONSOLE_URL")
		if consoleURL == "" {
			log.Printf("[sync %s] BACKEND_SYNC_URL and CONSOLE_URL not set, skipping sync", j.ID)
			return
		}
		syncURL = strings.TrimRight(consoleURL, "/") + "/api/crawler/sync"
	}
	secret := os.Getenv("WORKER_SECRET")

	type syncProduct struct {
		SourceURL string  `json:"source_url"`
		Title     string  `json:"title"`
		Image     *string `json:"image"`
		Shop      string  `json:"shop"`
		Price     *string `json:"price"`
		Currency  *string `json:"currency"`
	}

	var payload struct {
		JobID         string        `json:"jobId"`
		SitemapID     int64         `json:"sitemapId,omitempty"`
		ConsoleUserID string        `json:"consoleUserId,omitempty"`
		Scraped       int           `json:"scraped"`
		Total         int           `json:"total"`
		Done          bool          `json:"done"`
		Products      []syncProduct `json:"products"`
	}
	payload.JobID = j.ID
	payload.SitemapID = j.SitemapID
	payload.ConsoleUserID = j.ConsoleUserID
	payload.Scraped = scraped
	payload.Total = total
	payload.Done = done

	for _, p := range products {
		sp := syncProduct{Title: p.Name, Shop: p.Shop}
		if p.Image != "" {
			sp.Image = &p.Image
		}
		v := p.First()
		if v.URL != "" {
			sp.SourceURL = v.URL
		}
		if v.Price != "" {
			sp.Price = &v.Price
		}
		if v.Currency != "" {
			sp.Currency = &v.Currency
		}
		if sp.SourceURL == "" {
			continue
		}
		payload.Products = append(payload.Products, sp)
	}

	if len(payload.Products) == 0 {
		return
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, syncURL, strings.NewReader(string(body)))
	if err != nil {
		log.Printf("[sync %s] build request: %v", j.ID, err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+secret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[sync %s] request failed: %v", j.ID, err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[sync %s] batch sync → %d (%d products, %d/%d scraped, done=%v)",
		j.ID, resp.StatusCode, len(payload.Products), scraped, total, done)
}

func workerLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case jobID := <-jobQueue:
			log.Printf("dequeued job %s", jobID)
			go processJob(ctx, jobID)
		}
	}
}

// ---- HTTP helpers ----

func allowedOrigins() map[string]bool {
	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		return nil
	}
	set := make(map[string]bool)
	for _, o := range strings.Split(raw, ",") {
		if s := strings.TrimSpace(o); s != "" {
			set[s] = true
		}
	}
	return set
}

var originSet = allowedOrigins()

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if originSet == nil {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" && originSet[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		} else if origin != "" {
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusForbidden)
				return
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	secret := os.Getenv("WORKER_SECRET")
	return func(w http.ResponseWriter, r *http.Request) {
		if secret == "" {
			log.Println("WORKER_SECRET is not set — refusing request")
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "server misconfigured"})
			return
		}

		token := ""
		if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
			token = strings.TrimPrefix(auth, "Bearer ")
		} else if q := r.URL.Query().Get("token"); q != "" {
			token = q
		}

		if subtle.ConstantTimeCompare([]byte(token), []byte(secret)) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
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
	if len(req.Sites) == 0 && req.SitemapURL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "sites or sitemap_url required"})
		return
	}
	if req.MaxProducts <= 0 {
		req.MaxProducts = 0 // 0 = unlimited when using direct sitemap URL
	}
	if req.BatchSize <= 0 {
		req.BatchSize = defaultBatchSize
	}
	if req.BatchPauseSecs <= 0 {
		req.BatchPauseSecs = defaultBatchPauseSecs
	}

	now := time.Now()
	j := &Job{
		ID:             genID(),
		Sites:          req.Sites,
		SitemapURL:     req.SitemapURL,
		SitemapID:      req.SitemapID,
		ConsoleUserID:  req.ConsoleUserID,
		MaxProducts:    req.MaxProducts,
		BatchSize:      req.BatchSize,
		BatchPauseSecs: req.BatchPauseSecs,
		Status:         StatusQueued,
		Products:       []Product{},
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := dbCreateJob(j); err != nil {
		log.Printf("db create job: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	enqueueJob(j.ID)

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

	snap, _ := json.Marshal(ProgressEvent{
		Type:    "state",
		Scraped: j.Progress.Scraped,
		Skipped: j.Progress.Skipped,
		Total:   j.Progress.Total,
	})
	fmt.Fprintf(w, "data: %s\n\n", snap)
	flusher.Flush()

	if j.Status == StatusDone || j.Status == StatusFailed {
		done, _ := json.Marshal(ProgressEvent{Type: string(j.Status)})
		fmt.Fprintf(w, "data: %s\n\n", done)
		flusher.Flush()
		return
	}

	sub := subscribe(id)
	defer unsubscribe(id, sub)

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-heartbeat.C:
			fmt.Fprintf(w, ": ping\n\n")
			flusher.Flush()
		case msg, ok := <-sub.ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()

			var ev ProgressEvent
			if json.Unmarshal([]byte(msg), &ev) == nil && (ev.Type == "done" || ev.Type == "error") {
				return
			}
		}
	}
}

// ---- Router ----

func handleJobs(w http.ResponseWriter, r *http.Request) {
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

	go workerLoop(ctx)

	mux := http.NewServeMux()

	mux.HandleFunc("/health", cors(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}))

	mux.HandleFunc("/jobs", cors(requireAuth(handleJobs)))
	mux.HandleFunc("/jobs/", cors(requireAuth(handleJobs)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
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
