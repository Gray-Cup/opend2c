package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

func extractLDJSON(pageHTML string) string {
	rest := pageHTML
	for {
		idx := strings.Index(rest, `application/ld+json`)
		if idx == -1 {
			return ""
		}
		tagClose := strings.Index(rest[idx:], ">")
		if tagClose == -1 {
			return ""
		}
		bodyStart := idx + tagClose + 1
		bodyEnd := strings.Index(rest[bodyStart:], "</script>")
		if bodyEnd == -1 {
			return ""
		}
		body := strings.TrimSpace(rest[bodyStart : bodyStart+bodyEnd])
		rest = rest[bodyStart+bodyEnd:]
		if found := findProductInJSON(body); found != "" {
			return found
		}
	}
}

func findProductInJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	if len(raw) == 0 {
		return ""
	}
	switch raw[0] {
	case '[':
		var items []json.RawMessage
		if json.Unmarshal([]byte(raw), &items) != nil {
			return ""
		}
		for _, item := range items {
			if found := findProductInJSON(string(item)); found != "" {
				return found
			}
		}
	case '{':
		var obj map[string]json.RawMessage
		if json.Unmarshal([]byte(raw), &obj) != nil {
			return ""
		}
		atType := resolveAtType(obj["@type"])
		if atType == "Product" || atType == "ProductGroup" {
			return raw
		}
		if graphRaw, ok := obj["@graph"]; ok {
			if found := findProductInJSON(string(graphRaw)); found != "" {
				return found
			}
		}
	}
	return ""
}

func resolveAtType(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	var arr []string
	if json.Unmarshal(raw, &arr) == nil {
		for _, t := range arr {
			if t != "" {
				return t
			}
		}
	}
	return ""
}

func scrapeProduct(entry URLEntry, shopName string) (*Product, error) {
	data, err := fetch(entry.Loc)
	if err != nil {
		return nil, err
	}

	jsonStr := extractLDJSON(string(data))
	if jsonStr == "" {
		return nil, fmt.Errorf("no ld+json block")
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil, err
	}

	atType := resolveAtType(raw["@type"])

	var name string
	if v, ok := raw["name"]; ok {
		json.Unmarshal(v, &name)
	}
	if name == "" {
		return nil, fmt.Errorf("no product name")
	}

	image := ""
	if len(entry.Images) > 0 {
		image = entry.Images[0].Loc
	} else if v, ok := raw["image"]; ok {
		image = extractImageURL(v)
	}

	var variants []Variant

	if atType == "ProductGroup" {
		variants = parseProductGroupVariants(name, entry.Loc, raw)
		if image == "" {
			if hv, ok := raw["hasVariant"]; ok {
				var hvs []map[string]json.RawMessage
				if json.Unmarshal(hv, &hvs) == nil && len(hvs) > 0 {
					if img, ok := hvs[0]["image"]; ok {
						image = extractImageURL(img)
					}
				}
			}
		}
	} else {
		price, currency, offerURL := extractOfferInfo(raw["offers"])
		if offerURL == "" {
			offerURL = entry.Loc
		} else {
			offerURL = resolveURL(entry.Loc, offerURL)
		}
		variants = []Variant{{Price: price, Currency: currency, URL: offerURL}}
	}

	valid := variants[:0]
	for _, v := range variants {
		if !isZeroPrice(v.Price) {
			valid = append(valid, v)
		}
	}
	if len(valid) == 0 {
		return nil, fmt.Errorf("no priced variants")
	}

	return &Product{Name: name, Image: image, Shop: shopName, Variants: valid}, nil
}

func parseProductGroupVariants(productName, baseURL string, raw map[string]json.RawMessage) []Variant {
	hvRaw, ok := raw["hasVariant"]
	if !ok {
		return nil
	}
	var hvs []map[string]json.RawMessage
	if err := json.Unmarshal(hvRaw, &hvs); err != nil {
		return nil
	}
	seen := map[string]bool{}
	var out []Variant
	for _, hv := range hvs {
		var vName string
		if n, ok := hv["name"]; ok {
			json.Unmarshal(n, &vName)
		}
		price, currency, varURL := extractOfferInfo(hv["offers"])
		if isZeroPrice(price) {
			continue
		}
		if varURL != "" {
			varURL = resolveURL(baseURL, varURL)
		}
		label := stripPrefix(productName, vName)
		key := label + "|" + price
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, Variant{Label: label, Price: price, Currency: currency, URL: varURL})
	}
	return out
}

func extractOfferInfo(raw json.RawMessage) (price, currency, offerURL string) {
	if raw == nil {
		return
	}
	pick := func(m map[string]interface{}) {
		if p, ok := m["price"]; ok {
			s := fmt.Sprintf("%v", p)
			if f, err := strconv.ParseFloat(s, 64); err == nil {
				price = strconv.FormatFloat(f, 'f', -1, 64)
			} else {
				price = s
			}
		}
		if c, ok := m["priceCurrency"]; ok {
			currency = fmt.Sprintf("%v", c)
		}
		if u, ok := m["url"]; ok {
			offerURL = fmt.Sprintf("%v", u)
		}
	}
	var arr []map[string]interface{}
	if json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
		pick(arr[0])
		return
	}
	var obj map[string]interface{}
	if json.Unmarshal(raw, &obj) == nil {
		pick(obj)
	}
	return
}

func isZeroPrice(price string) bool {
	if price == "" {
		return true
	}
	f, err := strconv.ParseFloat(price, 64)
	return err == nil && f == 0
}

func extractImageURL(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	var arr []interface{}
	if json.Unmarshal(raw, &arr) == nil && len(arr) > 0 {
		if str, ok := arr[0].(string); ok {
			return str
		}
	}
	var obj map[string]interface{}
	if json.Unmarshal(raw, &obj) == nil {
		if u, ok := obj["url"]; ok {
			return fmt.Sprintf("%v", u)
		}
	}
	return ""
}

func stripPrefix(base, variant string) string {
	if p := base + " - "; strings.HasPrefix(variant, p) {
		return variant[len(p):]
	}
	return variant
}

func resolveURL(base, ref string) string {
	if strings.HasPrefix(ref, "http") {
		return ref
	}
	b, err := url.Parse(base)
	if err != nil {
		return ref
	}
	r, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return b.ResolveReference(r).String()
}

func shopLabel(site string) string {
	s := strings.TrimPrefix(strings.TrimPrefix(site, "https://"), "www.")
	return strings.Split(s, ".")[0]
}
