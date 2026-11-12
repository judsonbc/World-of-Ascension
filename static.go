package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"sort"
	"strconv"
	"strings"
)

// Static file serving with caching (v5_57).
//   - every file in web/ is loaded into memory once at start-up, with an ETag (content hash)
//   - text files are gzip-compressed once (index.html shrinks ~4x on phones / LAN)
//   - Cache-Control: no-cache + ETag  -> browsers keep a copy and re-check it with a tiny 304 reply
//   - /sw.js is generated: the placeholder __BUILD__ becomes a hash of all web files, so the service worker
//     (and its cache) refreshes by itself whenever you rebuild with changed files
type staticFile struct {
	raw, gz []byte
	etag    string
	ctype   string
}

type staticHandler struct {
	files map[string]*staticFile
	build string
	other http.Handler
}

func newStaticHandler(sub fs.FS) http.Handler {
	h := &staticHandler{files: map[string]*staticFile{}, other: http.FileServer(http.FS(sub))}
	var names []string
	_ = fs.WalkDir(sub, ".", func(p string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() {
			names = append(names, p)
		}
		return nil
	})
	sort.Strings(names)
	all := sha256.New()
	for _, n := range names {
		b, err := fs.ReadFile(sub, n)
		if err != nil {
			continue
		}
		if n != "sw.js" {
			all.Write([]byte(n))
			all.Write(b)
		}
		h.files["/"+n] = &staticFile{raw: b}
	}
	h.build = hex.EncodeToString(all.Sum(nil))[:12]
	if sw, ok := h.files["/sw.js"]; ok {
		sw.raw = bytes.ReplaceAll(sw.raw, []byte("__BUILD__"), []byte(h.build))
	}
	for n, f := range h.files {
		sum := sha256.Sum256(f.raw)
		f.etag = `"` + hex.EncodeToString(sum[:8]) + `"`
		f.ctype = mime.TypeByExtension(path.Ext(n))
		switch path.Ext(n) {
		case ".js":
			f.ctype = "application/javascript; charset=utf-8"
		case ".html":
			f.ctype = "text/html; charset=utf-8"
		case ".json":
			f.ctype = "application/json; charset=utf-8"
		}
		switch path.Ext(n) {
		case ".html", ".js", ".json", ".css", ".svg", ".txt":
			var buf bytes.Buffer
			zw, _ := gzip.NewWriterLevel(&buf, gzip.BestCompression)
			zw.Write(f.raw)
			zw.Close()
			if buf.Len() < len(f.raw) {
				f.gz = buf.Bytes()
			}
		}
	}
	return h
}

func (h *staticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		h.other.ServeHTTP(w, r)
		return
	}
	p := path.Clean("/" + r.URL.Path)
	if p == "/" {
		p = "/index.html"
	}
	f, ok := h.files[p]
	if !ok {
		h.other.ServeHTTP(w, r)
		return
	}
	hd := w.Header()
	hd.Set("ETag", f.etag)
	hd.Set("Cache-Control", "no-cache")
	if p == "/sw.js" {
		hd.Set("Service-Worker-Allowed", "/")
	}
	if inm := r.Header.Get("If-None-Match"); inm != "" && strings.Contains(inm, f.etag) {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	body := f.raw
	if f.gz != nil {
		hd.Set("Vary", "Accept-Encoding")
		if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			hd.Set("Content-Encoding", "gzip")
			body = f.gz
		}
	}
	hd.Set("Content-Type", f.ctype)
	hd.Set("Content-Length", strconv.Itoa(len(body)))
	w.WriteHeader(http.StatusOK)
	if r.Method == http.MethodGet {
		w.Write(body)
	}
}
