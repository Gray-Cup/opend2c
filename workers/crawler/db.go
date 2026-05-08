package main

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func initDB() error {
	dsn := os.Getenv("DATABASE_URL")

	var err error
	db, err = pgxpool.New(context.Background(), dsn)
	if err != nil {
		return err
	}
	if err := db.Ping(context.Background()); err != nil {
		return err
	}
	return migrate()
}

func migrate() error {
	_, err := db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS crawl_jobs (
			id           TEXT PRIMARY KEY,
			sites        TEXT NOT NULL,
			max_products INT NOT NULL DEFAULT 500,
			status       TEXT NOT NULL DEFAULT 'queued',
			scraped      INT NOT NULL DEFAULT 0,
			skipped      INT NOT NULL DEFAULT 0,
			total        INT NOT NULL DEFAULT 0,
			error        TEXT,
			created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS crawl_products (
			id         BIGSERIAL PRIMARY KEY,
			job_id     TEXT NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
			name       TEXT NOT NULL,
			image      TEXT,
			shop       TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS crawl_variants (
			id         BIGSERIAL PRIMARY KEY,
			product_id BIGINT NOT NULL REFERENCES crawl_products(id) ON DELETE CASCADE,
			label      TEXT,
			price      TEXT NOT NULL,
			currency   TEXT,
			url        TEXT
		);
		CREATE INDEX IF NOT EXISTS idx_crawl_products_job_id ON crawl_products(job_id);
	`)
	return err
}

// ---- Write ----

func dbCreateJob(j *Job) error {
	sites, _ := json.Marshal(j.Sites)
	_, err := db.Exec(context.Background(),
		`INSERT INTO crawl_jobs (id, sites, max_products, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		j.ID, string(sites), j.MaxProducts, j.Status, j.CreatedAt, j.UpdatedAt,
	)
	return err
}

func dbSetStatus(id string, status JobStatus) error {
	_, err := db.Exec(context.Background(),
		`UPDATE crawl_jobs SET status=$1, updated_at=NOW() WHERE id=$2`,
		string(status), id,
	)
	return err
}

func dbUpdateProgress(id string, scraped, skipped, total int) error {
	_, err := db.Exec(context.Background(),
		`UPDATE crawl_jobs SET scraped=$1, skipped=$2, total=$3, updated_at=NOW() WHERE id=$4`,
		scraped, skipped, total, id,
	)
	return err
}

func dbSetError(id, msg string) error {
	_, err := db.Exec(context.Background(),
		`UPDATE crawl_jobs SET status='failed', error=$1, updated_at=NOW() WHERE id=$2`,
		msg, id,
	)
	return err
}

func dbInsertProduct(jobID string, p *Product) (int64, error) {
	var pid int64
	err := db.QueryRow(context.Background(),
		`INSERT INTO crawl_products (job_id, name, image, shop) VALUES ($1,$2,$3,$4) RETURNING id`,
		jobID, p.Name, p.Image, p.Shop,
	).Scan(&pid)
	return pid, err
}

func dbInsertVariants(productID int64, variants []Variant) error {
	for _, v := range variants {
		if _, err := db.Exec(context.Background(),
			`INSERT INTO crawl_variants (product_id, label, price, currency, url) VALUES ($1,$2,$3,$4,$5)`,
			productID, v.Label, v.Price, v.Currency, v.URL,
		); err != nil {
			return err
		}
	}
	return nil
}

// ---- Read ----

func dbGetJob(id string) (*Job, error) {
	row := db.QueryRow(context.Background(),
		`SELECT id, sites, max_products, status, scraped, skipped, total, COALESCE(error,''), created_at, updated_at
		 FROM crawl_jobs WHERE id=$1`, id,
	)
	return scanJob(row)
}

func dbListJobs() ([]*Job, error) {
	rows, err := db.Query(context.Background(),
		`SELECT id, sites, max_products, status, scraped, skipped, total, COALESCE(error,''), created_at, updated_at
		 FROM crawl_jobs ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Job
	for rows.Next() {
		j, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, j)
	}
	return out, rows.Err()
}

func dbGetProducts(jobID string) ([]Product, error) {
	rows, err := db.Query(context.Background(),
		`SELECT id, name, image, shop FROM crawl_products WHERE job_id=$1 ORDER BY id`, jobID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type row struct {
		id int64
		p  Product
	}
	var prows []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.p.Name, &r.p.Image, &r.p.Shop); err != nil {
			return nil, err
		}
		r.p.Variants = []Variant{}
		prows = append(prows, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i, r := range prows {
		vrows, err := db.Query(context.Background(),
			`SELECT COALESCE(label,''), price, COALESCE(currency,''), COALESCE(url,'')
			 FROM crawl_variants WHERE product_id=$1 ORDER BY id`, r.id,
		)
		if err != nil {
			return nil, err
		}
		for vrows.Next() {
			var v Variant
			vrows.Scan(&v.Label, &v.Price, &v.Currency, &v.URL)
			prows[i].p.Variants = append(prows[i].p.Variants, v)
		}
		vrows.Close()
	}

	out := make([]Product, len(prows))
	for i, r := range prows {
		out[i] = r.p
	}
	return out, nil
}

// ---- Scan helpers ----

type scanner interface {
	Scan(dest ...any) error
}

func scanJob(s scanner) (*Job, error) {
	var j Job
	var sitesJSON, errStr string
	var createdAt, updatedAt time.Time
	if err := s.Scan(
		&j.ID, &sitesJSON, &j.MaxProducts, &j.Status,
		&j.Progress.Scraped, &j.Progress.Skipped, &j.Progress.Total,
		&errStr, &createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(sitesJSON), &j.Sites)
	j.Error = errStr
	j.CreatedAt = createdAt
	j.UpdatedAt = updatedAt
	j.Products = []Product{}
	return &j, nil
}
