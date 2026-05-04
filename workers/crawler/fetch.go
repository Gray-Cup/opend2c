package main

import (
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"
)

var userAgents = []string{
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
}

type domainState struct {
	mu        sync.Mutex
	remaining int
	resetAt   time.Time
}

var (
	domainsMu sync.Mutex
	domains   = map[string]*domainState{}
)

var httpClient = &http.Client{Timeout: 30 * time.Second}

func getDomainState(rawURL string) *domainState {
	u, _ := url.Parse(rawURL)
	domainsMu.Lock()
	defer domainsMu.Unlock()
	if ds, ok := domains[u.Host]; ok {
		return ds
	}
	ds := &domainState{remaining: -1}
	domains[u.Host] = ds
	return ds
}

func jitter(minMs, maxMs int) time.Duration {
	return time.Duration(minMs+rand.Intn(maxMs-minMs)) * time.Millisecond
}

func parseRetryAfter(h http.Header) time.Duration {
	v := h.Get("Retry-After")
	if v == "" {
		return 0
	}
	if secs, err := strconv.Atoi(v); err == nil {
		return time.Duration(secs)*time.Second + jitter(500, 1500)
	}
	if t, err := http.ParseTime(v); err == nil {
		if d := time.Until(t); d > 0 {
			return d + jitter(500, 1500)
		}
	}
	return 5 * time.Second
}

func updateDomainState(ds *domainState, h http.Header) {
	remaining := -1
	for _, key := range []string{"RateLimit-Remaining", "X-RateLimit-Remaining"} {
		if v := h.Get(key); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				remaining = n
				break
			}
		}
	}
	var resetAt time.Time
	for _, key := range []string{"RateLimit-Reset", "X-RateLimit-Reset"} {
		if v := h.Get(key); v != "" {
			if secs, err := strconv.ParseInt(v, 10, 64); err == nil {
				resetAt = time.Unix(secs, 0)
			} else if t, err := http.ParseTime(v); err == nil {
				resetAt = t
			}
			break
		}
	}
	ds.mu.Lock()
	ds.remaining = remaining
	if !resetAt.IsZero() {
		ds.resetAt = resetAt
	}
	ds.mu.Unlock()
}

func fetchSitemap(targetURL string) ([]byte, error) {
	return fetchWithDelay(targetURL, 300, 700)
}

func fetch(targetURL string) ([]byte, error) {
	return fetchWithDelay(targetURL, 900, 2200)
}

func fetchWithDelay(targetURL string, minMs, maxMs int) ([]byte, error) {
	ds := getDomainState(targetURL)
	const maxRetries = 6

	for attempt := 0; attempt < maxRetries; attempt++ {
		ds.mu.Lock()
		rem, resetAt := ds.remaining, ds.resetAt
		ds.mu.Unlock()

		switch {
		case rem == 0 && !resetAt.IsZero() && time.Now().Before(resetAt):
			wait := time.Until(resetAt) + jitter(500, 1500)
			time.Sleep(wait)
		case rem > 0 && rem < 8:
			time.Sleep(jitter(2000, 3500))
		default:
			time.Sleep(jitter(minMs, maxMs))
		}

		data, status, headers, err := doFetch(targetURL)
		if err != nil {
			return nil, err
		}
		updateDomainState(ds, headers)

		if status == 429 {
			wait := parseRetryAfter(headers)
			if wait == 0 {
				wait = time.Duration(4<<uint(attempt))*time.Second + jitter(0, 3000)
			}
			time.Sleep(wait)
			continue
		}
		if status != 200 {
			return nil, fmt.Errorf("HTTP %d for %s", status, targetURL)
		}
		return data, nil
	}
	return nil, fmt.Errorf("gave up after %d retries: %s", maxRetries, targetURL)
}

func doFetch(targetURL string) ([]byte, int, http.Header, error) {
	req, _ := http.NewRequest("GET", targetURL, nil)
	req.Header = http.Header{
		"User-Agent":                []string{userAgents[rand.Intn(len(userAgents))]},
		"Accept":                    []string{"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"},
		"Accept-Language":           []string{"en-US,en;q=0.9"},
		"Connection":                []string{"keep-alive"},
		"Upgrade-Insecure-Requests": []string{"1"},
		"Sec-Fetch-Dest":            []string{"document"},
		"Sec-Fetch-Mode":            []string{"navigate"},
		"Sec-Fetch-Site":            []string{"none"},
		"Sec-Fetch-User":            []string{"?1"},
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, 0, nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, resp.StatusCode, resp.Header, nil
	}
	data, err := io.ReadAll(resp.Body)
	return data, resp.StatusCode, resp.Header, err
}
