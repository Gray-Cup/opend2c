package main

import (
	"encoding/xml"
	"strings"
)

type SitemapIndex struct {
	Sitemaps []struct {
		Loc string `xml:"loc"`
	} `xml:"sitemap"`
}

type URLSet struct {
	URLs []URLEntry `xml:"url"`
}

type URLEntry struct {
	Loc    string       `xml:"loc"`
	Images []ImageEntry `xml:"http://www.google.com/schemas/sitemap-image/1.1 image"`
}

type ImageEntry struct {
	Loc string `xml:"http://www.google.com/schemas/sitemap-image/1.1 loc"`
}

func getProductSitemaps(baseURL string) ([]string, error) {
	data, err := fetchSitemap(baseURL + "/sitemap.xml")
	if err != nil {
		return nil, err
	}
	var index SitemapIndex
	if err := xml.Unmarshal(data, &index); err != nil {
		return nil, err
	}
	var out []string
	for _, s := range index.Sitemaps {
		if strings.Contains(s.Loc, "sitemap_products") {
			out = append(out, s.Loc)
		}
	}
	return out, nil
}

func getProductURLs(sitemapURL string) ([]URLEntry, error) {
	data, err := fetchSitemap(sitemapURL)
	if err != nil {
		return nil, err
	}
	var urlset URLSet
	if err := xml.Unmarshal(data, &urlset); err != nil {
		return nil, err
	}
	return urlset.URLs, nil
}
