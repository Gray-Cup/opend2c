package main

import (
	"context"
	"encoding/json"
	"os"

	"github.com/redis/go-redis/v9"
)

var rdb *redis.Client

const queueKey = "crawl:queue"

func progressChannel(jobID string) string { return "crawl:progress:" + jobID }

func initRedis() error {
	rawURL := os.Getenv("REDIS_URL")
	if rawURL == "" {
		rawURL = "redis://localhost:6379"
	}
	opts, err := redis.ParseURL(rawURL)
	if err != nil {
		return err
	}
	rdb = redis.NewClient(opts)
	return rdb.Ping(context.Background()).Err()
}

// ---- Queue ----

func enqueueJob(ctx context.Context, jobID string) error {
	return rdb.LPush(ctx, queueKey, jobID).Err()
}

// dequeueJob blocks until a job is available.
func dequeueJob(ctx context.Context) (string, error) {
	res, err := rdb.BRPop(ctx, 0, queueKey).Result()
	if err != nil {
		return "", err
	}
	return res[1], nil
}

// ---- Progress pub/sub ----

type ProgressEvent struct {
	Type    string   `json:"type"` // "progress" | "done" | "error"
	Scraped int      `json:"scraped,omitempty"`
	Skipped int      `json:"skipped,omitempty"`
	Total   int      `json:"total,omitempty"`
	Product *Product `json:"product,omitempty"`
	Message string   `json:"message,omitempty"`
}

func publishProgress(ctx context.Context, jobID string, ev ProgressEvent) {
	data, _ := json.Marshal(ev)
	rdb.Publish(ctx, progressChannel(jobID), string(data))
}
