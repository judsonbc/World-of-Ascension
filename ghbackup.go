package main

// v5_274 GITHUB BACKUP. For hosts without a persistent disk (Render free): the player data is copied to a PRIVATE GitHub repository and is
// copied back automatically when the server starts with an empty data folder.
//
// Set these environment variables on the host (nothing is stored in the code):
//   GITHUB_TOKEN          fine-grained personal access token, only for the backup repository, permission "Contents: Read and write"
//   GITHUB_BACKUP_REPO    owner/name of the PRIVATE repository, e.g. myname/woa-data   (NOT the repository the host deploys from)
//   GITHUB_BACKUP_BRANCH  optional, default "main"
//   GITHUB_BACKUP_DIR     optional folder inside the repository, default "woa-data"
//   GITHUB_BACKUP_MINUTES optional: also back up every N minutes (only when something changed). Default 0 = only /backup and on shutdown
//
// Backed up: users.json (accounts + character saves), friends.json, coupons.json, whispers.json. NOT backed up: secret.key (players just log in
// again after a restore). A file is only restored when it is MISSING in the data folder, so a restore never overwrites newer data.

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

var ghFiles = []string{"users.json", "friends.json", "coupons.json", "whispers.json"}

var (
	ghMu     sync.Mutex
	ghLast   = map[string]string{} // file -> hash of the content last pushed (or restored), so unchanged files are not pushed again
	ghClient = &http.Client{Timeout: 25 * time.Second}
)

func ghConfigured() bool {
	return os.Getenv("GITHUB_TOKEN") != "" && strings.Contains(os.Getenv("GITHUB_BACKUP_REPO"), "/")
}

func ghBranch() string {
	if b := strings.TrimSpace(os.Getenv("GITHUB_BACKUP_BRANCH")); b != "" {
		return b
	}
	return "main"
}

func ghDir() string {
	d := strings.Trim(strings.TrimSpace(os.Getenv("GITHUB_BACKUP_DIR")), "/")
	if d == "" {
		d = "woa-data"
	}
	return d
}

func ghURL(name string) string {
	return "https://api.github.com/repos/" + strings.TrimSpace(os.Getenv("GITHUB_BACKUP_REPO")) + "/contents/" + ghDir() + "/" + name
}

func ghDo(method, u string, accept string, body []byte) (int, []byte, error) {
	var rd io.Reader
	if body != nil {
		rd = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, u, rd)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(os.Getenv("GITHUB_TOKEN")))
	req.Header.Set("Accept", accept)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "world-of-ascension-backup")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := ghClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 120<<20))
	return resp.StatusCode, b, err
}

func ghHash(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

// ghPush uploads one file (creating or updating it). Returns true when something was pushed.
func ghPush(name string, data []byte) (bool, error) {
	hs := ghHash(data)
	if ghLast[name] == hs {
		return false, nil
	}
	u := ghURL(name) + "?ref=" + url.QueryEscape(ghBranch())
	sha := ""
	code, body, err := ghDo("GET", u, "application/vnd.github+json", nil)
	if err != nil {
		return false, err
	}
	if code == 200 {
		var meta struct {
			Sha string `json:"sha"`
		}
		if json.Unmarshal(body, &meta) == nil {
			sha = meta.Sha
		}
	} else if code != 404 {
		return false, fmt.Errorf("GitHub answered %d while reading %s: %s", code, name, ghShort(body))
	}
	payload := map[string]interface{}{
		"message": "WoA data backup " + time.Now().UTC().Format("2006-01-02 15:04:05") + " UTC",
		"content": base64.StdEncoding.EncodeToString(data),
		"branch":  ghBranch(),
	}
	if sha != "" {
		payload["sha"] = sha
	}
	pb, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}
	code, body, err = ghDo("PUT", ghURL(name), "application/vnd.github+json", pb)
	if err != nil {
		return false, err
	}
	if code != 200 && code != 201 {
		return false, fmt.Errorf("GitHub answered %d while saving %s: %s", code, name, ghShort(body))
	}
	ghLast[name] = hs
	return true, nil
}

func ghShort(b []byte) string {
	s := strings.TrimSpace(string(b))
	if len(s) > 160 {
		s = s[:160]
	}
	return s
}

// ghBackup pushes every data file that changed since the last push. Returns a short report for the admin.
func ghBackup() (string, error) {
	if !ghConfigured() {
		return "", fmt.Errorf("GitHub backup is not set up: set GITHUB_TOKEN and GITHUB_BACKUP_REPO (owner/name of a private repository) on the server")
	}
	ghMu.Lock()
	defer ghMu.Unlock()
	if accts != nil {
		accts.flush() // write the newest saves to users.json first
	}
	pushed, same := 0, 0
	for _, n := range ghFiles {
		data, err := os.ReadFile(filepath.Join(dataDir, n))
		if err != nil || len(data) == 0 {
			continue
		}
		ok, err := ghPush(n, data)
		if err != nil {
			return "", err
		}
		if ok {
			pushed++
		} else {
			same++
		}
	}
	if pushed == 0 && same == 0 {
		return "", fmt.Errorf("there is no data to back up yet")
	}
	if pushed == 0 {
		return "Backup is up to date (nothing changed since the last backup).", nil
	}
	return "Backup saved to GitHub: " + strconv.Itoa(pushed) + " file(s) updated.", nil
}

// ghRestoreMissing runs at start-up, before the accounts are loaded: every data file that does not exist in the data folder is fetched from GitHub.
func ghRestoreMissing() {
	if !ghConfigured() {
		return
	}
	ghMu.Lock()
	defer ghMu.Unlock()
	for _, n := range ghFiles {
		p := filepath.Join(dataDir, n)
		if st, err := os.Stat(p); err == nil && st.Size() > 0 {
			continue
		}
		code, body, err := ghDo("GET", ghURL(n)+"?ref="+url.QueryEscape(ghBranch()), "application/vnd.github.raw+json", nil)
		if err != nil {
			log.Printf("GitHub restore of %s failed: %v", n, err)
			continue
		}
		if code == 404 {
			continue // never backed up
		}
		if code != 200 || len(body) == 0 {
			log.Printf("GitHub restore of %s failed: status %d %s", n, code, ghShort(body))
			continue
		}
		if n == "users.json" || n == "friends.json" || n == "coupons.json" || n == "whispers.json" {
			var probe interface{}
			if json.Unmarshal(body, &probe) != nil {
				log.Printf("GitHub restore of %s skipped: the file in the repository is not valid JSON", n)
				continue
			}
		}
		tmp := p + ".tmp"
		if err := os.WriteFile(tmp, body, 0o600); err != nil {
			log.Printf("GitHub restore of %s failed: %v", n, err)
			continue
		}
		if err := os.Rename(tmp, p); err != nil {
			log.Printf("GitHub restore of %s failed: %v", n, err)
			continue
		}
		ghLast[n] = ghHash(body)
		fmt.Printf("  restored %s from GitHub (%d bytes)\n", n, len(body))
	}
}

// ghStartTimer: optional periodic backup (GITHUB_BACKUP_MINUTES).
func ghStartTimer() {
	if !ghConfigured() {
		return
	}
	m, _ := strconv.Atoi(strings.TrimSpace(os.Getenv("GITHUB_BACKUP_MINUTES")))
	if m <= 0 {
		return
	}
	if m < 5 {
		m = 5
	}
	go func() {
		for range time.Tick(time.Duration(m) * time.Minute) {
			if _, err := ghBackup(); err != nil {
				log.Printf("GitHub backup failed: %v", err)
			}
		}
	}()
	fmt.Printf("GitHub backup every %d minute(s) is on\n", m)
}
