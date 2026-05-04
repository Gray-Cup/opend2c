package main

import "time"

type Variant struct {
	Label    string `json:"label"`
	Price    string `json:"price"`
	Currency string `json:"currency"`
	URL      string `json:"url"`
}

func (v Variant) DisplayPrice() string {
	if v.Currency != "" {
		return v.Currency + " " + v.Price
	}
	return v.Price
}

type Product struct {
	Name     string    `json:"name"`
	Image    string    `json:"image"`
	Shop     string    `json:"shop"`
	Variants []Variant `json:"variants"`
}

func (p Product) First() Variant {
	if len(p.Variants) == 0 {
		return Variant{}
	}
	return p.Variants[0]
}

func (p Product) Multi() bool {
	return len(p.Variants) > 1
}

type JobStatus string

const (
	StatusQueued  JobStatus = "queued"
	StatusRunning JobStatus = "running"
	StatusDone    JobStatus = "done"
	StatusFailed  JobStatus = "failed"
)

type JobProgress struct {
	Scraped int `json:"scraped"`
	Skipped int `json:"skipped"`
	Total   int `json:"total"`
}

type Job struct {
	ID          string      `json:"id"`
	Sites       []string    `json:"sites"`
	MaxProducts int         `json:"max_products"`
	Status      JobStatus   `json:"status"`
	Progress    JobProgress `json:"progress"`
	Products    []Product   `json:"products"`
	Error       string      `json:"error,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type StartJobRequest struct {
	Sites       []string `json:"sites"`
	MaxProducts int      `json:"max_products"`
}
