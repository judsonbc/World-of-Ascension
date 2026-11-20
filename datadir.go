package main

// v5_250 DATA FOLDER. Everything that belongs to the players (accounts + character saves, friends, whispers, coupons, the login secret)
// lives in ONE folder, "data" next to where the server is started (or -data <folder> / ALOTUS_DATA). The game files (the exe, web/, the
// source) never contain it, so replacing / updating the game does not touch player progress. Pass the same -data every time you start.

import (
	"log"
	"os"
	"path/filepath"
)

var (
	dataDir     = "data"
	usersFile   = "data/users.json"
	secretFile  = "data/secret.key"
	couponsFile = "data/coupons.json"
	friendsFile = "data/friends.json"
	offlineFile = "data/whispers.json"
)

var legacyDataNames = []string{"users.json", "users.json.bak", "secret.key", "coupons.json", "friends.json", "whispers.json"}

func initDataDir(dir string) {
	if dir == "" {
		dir = os.Getenv("ALOTUS_DATA")
	}
	if dir == "" {
		dir = "data"
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatalf("cannot create the data folder %s: %v", dir, err)
	}
	dataDir = dir
	usersFile = filepath.Join(dir, "users.json")
	secretFile = filepath.Join(dir, "secret.key")
	couponsFile = filepath.Join(dir, "coupons.json")
	friendsFile = filepath.Join(dir, "friends.json")
	offlineFile = filepath.Join(dir, "whispers.json")
	// one-time move of the old layout: files that sit next to the program (or next to the exe) are COPIED into the data folder
	// when the data folder does not have them yet. The old files are left where they are.
	srcs := []string{"."}
	if exe, err := os.Executable(); err == nil {
		srcs = append(srcs, filepath.Dir(exe))
	}
	for _, n := range legacyDataNames {
		dst := filepath.Join(dir, n)
		if _, err := os.Stat(dst); err == nil {
			continue
		}
		for _, d := range srcs {
			if b, err := os.ReadFile(filepath.Join(d, n)); err == nil && len(b) > 0 {
				if os.WriteFile(dst, b, 0o600) == nil {
					log.Printf("copied %s from %s into the data folder", n, d)
				}
				break
			}
		}
	}
}
