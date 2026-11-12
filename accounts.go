package main

// Accounts: register / log in with email + password. Standard library only.
//   POST /api/register  {"email","password"}  -> {"token","email"}
//   POST /api/login     {"email","password"}  -> {"token","email"}
//   GET  /api/me        (Authorization: Bearer <token>) -> {"email","ign"}
//   GET  /api/ign/check?name=X  (Bearer) -> {"ok","name","error"}   is this in-game name (IGN) free?
//   POST /api/ign       (Bearer) {"name"}  -> {"ign"}   claims the IGN for this account; permanent, can only be set once
//   GET  /api/load      (Bearer)  -> the character save stored for this account (or null)
//   POST /api/save      (Bearer)  body = character save JSON
//   POST /api/forgot    {"email"}  -> emails a 6-digit reset code (always answers ok, so emails can't be probed)
//   POST /api/reset     {"email","code","password"}  -> sets the new password and logs in
// Passwords are only stored as hashes, so they can never be emailed back: the email carries a one-time reset code instead.
// Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes in users.json (next to the program).
// Tokens are HMAC-signed with a random secret kept in secret.key, valid 30 days, and are also required
// by the game socket's join message, so nobody can play without an account.
// NOTE: over plain http (LAN) passwords travel unencrypted; for internet play use an HTTPS tunnel.

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/mail"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	usersFile  = "users.json"
	secretFile = "secret.key"
	pbkdfIter  = 120000
	tokenTTL   = 30 * 24 * time.Hour
	maxSave    = 64 * 1024
)

var accts *Accounts

type User struct {
	Email   string          `json:"email"`
	Salt    string          `json:"salt"`
	Hash    string          `json:"hash"`
	Created int64           `json:"created"`
	IGN     string          `json:"ign,omitempty"` // permanent in-game name, unique (case-insensitive), set once
	Gold    int64           `json:"gold,omitempty"` // premium currency, server-side only (see coupons.go)
	Save    json.RawMessage `json:"save,omitempty"`
}

type Accounts struct {
	mu     sync.Mutex
	users  map[string]*User
	secret []byte
	dirty  bool
	tries  map[string][]time.Time // login/register attempts per IP
	resets map[string]*resetCode  // pending password-reset codes by email
	saveSeq map[string]int64       // counts saves per account (so a login can wait for the newest one)
}

type resetCode struct {
	code  string
	exp   time.Time
	tries int
	sent  time.Time
}

func pbkdf2(password, salt []byte, iter, keyLen int) []byte {
	prf := hmac.New(sha256.New, password)
	hLen := prf.Size()
	blocks := (keyLen + hLen - 1) / hLen
	out := make([]byte, 0, blocks*hLen)
	var ib [4]byte
	for b := 1; b <= blocks; b++ {
		prf.Reset()
		prf.Write(salt)
		binary.BigEndian.PutUint32(ib[:], uint32(b))
		prf.Write(ib[:])
		u := prf.Sum(nil)
		t := make([]byte, len(u))
		copy(t, u)
		for i := 1; i < iter; i++ {
			prf.Reset()
			prf.Write(u)
			u = prf.Sum(u[:0])
			for j := range t {
				t[j] ^= u[j]
			}
		}
		out = append(out, t...)
	}
	return out[:keyLen]
}

func loadAccounts() *Accounts {
	a := &Accounts{users: map[string]*User{}, tries: map[string][]time.Time{}, resets: map[string]*resetCode{}}
	if b, err := os.ReadFile(secretFile); err == nil && len(b) >= 32 {
		a.secret = b
	} else {
		a.secret = make([]byte, 32)
		if _, err := rand.Read(a.secret); err != nil {
			log.Fatal(err)
		}
		if err := os.WriteFile(secretFile, a.secret, 0o600); err != nil {
			log.Printf("warning: cannot write %s (logins will reset on restart): %v", secretFile, err)
		}
	}
	if b, err := os.ReadFile(usersFile); err == nil {
		var list []*User
		if json.Unmarshal(b, &list) == nil {
			for _, u := range list {
				a.users[u.Email] = u
			}
		}
	}
	go a.flusher()
	return a
}

func (a *Accounts) flusher() {
	for range time.Tick(5 * time.Second) {
		a.flush()
	}
}

func (a *Accounts) flush() {
	a.mu.Lock()
	if !a.dirty {
		a.mu.Unlock()
		return
	}
	list := make([]*User, 0, len(a.users))
	for _, u := range a.users {
		list = append(list, u)
	}
	b, err := json.Marshal(list)
	a.dirty = false
	a.mu.Unlock()
	if err != nil {
		return
	}
	tmp := usersFile + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("cannot save accounts: %v", err)
		return
	}
	if err := os.Rename(tmp, usersFile); err != nil {
		log.Printf("cannot save accounts: %v", err)
	}
}

/* ---------------------------------------------------------------- tokens */

func (a *Accounts) sign(msg string) string {
	m := hmac.New(sha256.New, a.secret)
	m.Write([]byte(msg))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func (a *Accounts) makeToken(email string) string {
	payload := base64.RawURLEncoding.EncodeToString([]byte(email + "|" + strconv.FormatInt(time.Now().Add(tokenTTL).Unix(), 10)))
	return payload + "." + a.sign(payload)
}

// verify returns the email for a valid, unexpired token whose account still exists.
func (a *Accounts) verify(tok string) (string, bool) {
	i := strings.IndexByte(tok, '.')
	if i < 0 {
		return "", false
	}
	payload, sig := tok[:i], tok[i+1:]
	if subtle.ConstantTimeCompare([]byte(sig), []byte(a.sign(payload))) != 1 {
		return "", false
	}
	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return "", false
	}
	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return "", false
	}
	exp, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil || time.Now().Unix() > exp {
		return "", false
	}
	a.mu.Lock()
	_, ok := a.users[parts[0]]
	a.mu.Unlock()
	if !ok {
		return "", false
	}
	return parts[0], true
}

/* ---------------------------------------------------------------- http */

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func clientIP(r *http.Request) string {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

// throttle allows 12 register/login attempts per IP per minute.
func (a *Accounts) throttle(ip string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	now := time.Now()
	keep := a.tries[ip][:0]
	for _, t := range a.tries[ip] {
		if now.Sub(t) < time.Minute {
			keep = append(keep, t)
		}
	}
	if len(keep) >= 12 {
		a.tries[ip] = keep
		return false
	}
	a.tries[ip] = append(keep, now)
	return true
}

type credIn struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Confirm  string `json:"confirm"` // register only: must equal Password
}

func parseEmail(s string) (string, error) {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" || len(s) > 254 {
		return "", errors.New("Enter a valid email address.")
	}
	ad, err := mail.ParseAddress(s)
	if err != nil || ad.Address != s || !strings.Contains(s[strings.IndexByte(s, '@'):], ".") {
		return "", errors.New("Enter a valid email address.")
	}
	return s, nil
}

func readCreds(w http.ResponseWriter, r *http.Request) (*credIn, bool) {
	if r.Method != http.MethodPost {
		fail(w, http.StatusMethodNotAllowed, "POST only")
		return nil, false
	}
	var in credIn
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&in); err != nil {
		fail(w, http.StatusBadRequest, "Bad request.")
		return nil, false
	}
	return &in, true
}

func (a *Accounts) handleRegister(w http.ResponseWriter, r *http.Request) {
	in, ok := readCreds(w, r)
	if !ok {
		return
	}
	if !a.throttle(clientIP(r)) {
		fail(w, http.StatusTooManyRequests, "Too many attempts. Wait a minute and try again.")
		return
	}
	email, err := parseEmail(in.Email)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(in.Password) < 8 {
		fail(w, http.StatusBadRequest, "Password must be at least 8 characters.")
		return
	}
	if len(in.Password) > 128 {
		fail(w, http.StatusBadRequest, "Password is too long (128 max).")
		return
	}
	if subtle.ConstantTimeCompare([]byte(in.Password), []byte(in.Confirm)) != 1 {
		fail(w, http.StatusBadRequest, "Passwords do not match.")
		return
	}
	salt := make([]byte, 16)
	rand.Read(salt)
	hash := pbkdf2([]byte(in.Password), salt, pbkdfIter, 32)
	a.mu.Lock()
	if _, exists := a.users[email]; exists {
		a.mu.Unlock()
		fail(w, http.StatusConflict, "That email is already registered. Log in instead.")
		return
	}
	a.users[email] = &User{Email: email, Salt: hex.EncodeToString(salt), Hash: hex.EncodeToString(hash), Created: time.Now().Unix()}
	a.dirty = true
	a.mu.Unlock()
	a.flush()
	log.Printf("registered %s", email)
	writeJSON(w, 200, map[string]string{"token": a.makeToken(email), "email": email})
}

func (a *Accounts) handleLogin(w http.ResponseWriter, r *http.Request) {
	in, ok := readCreds(w, r)
	if !ok {
		return
	}
	if !a.throttle(clientIP(r)) {
		fail(w, http.StatusTooManyRequests, "Too many attempts. Wait a minute and try again.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	a.mu.Lock()
	u := a.users[email]
	a.mu.Unlock()
	salt, want := make([]byte, 16), make([]byte, 32)
	if u != nil {
		salt, _ = hex.DecodeString(u.Salt)
		want, _ = hex.DecodeString(u.Hash)
	}
	got := pbkdf2([]byte(in.Password), salt, pbkdfIter, 32) // always computed, so timing doesn't reveal which emails exist
	if u == nil || subtle.ConstantTimeCompare(got, want) != 1 {
		fail(w, http.StatusUnauthorized, "Wrong email or password.")
		return
	}
	writeJSON(w, 200, map[string]string{"token": a.makeToken(email), "email": email})
}

func (a *Accounts) authed(w http.ResponseWriter, r *http.Request) (string, bool) {
	tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	email, ok := a.verify(tok)
	if !ok {
		fail(w, http.StatusUnauthorized, "Please log in again.")
		return "", false
	}
	return email, true
}

func (a *Accounts) handleMe(w http.ResponseWriter, r *http.Request) {
	if email, ok := a.authed(w, r); ok {
		writeJSON(w, 200, map[string]string{"email": email, "ign": a.ignOf(email)})
	}
}

/* ---------------------------------------------------------------- in-game name (IGN) */

var reservedIGN = map[string]bool{"you": true, "system": true, "server": true, "admin": true, "gm": true, "all": true, "world": true}

// ignOf returns the account's permanent in-game name, or "" if it has not chosen one yet.
func (a *Accounts) ignOf(email string) string {
	a.mu.Lock()
	defer a.mu.Unlock()
	if u := a.users[email]; u != nil {
		return u.IGN
	}
	return ""
}

// normIGN validates a requested name and returns it with spaces tidied. The name is never silently altered:
// anything outside the allowed characters or length is rejected so the player sees exactly what is wrong.
func normIGN(s string) (string, error) {
	s = strings.Join(strings.Fields(s), " ")
	n := len([]rune(s))
	if n < 2 || n > 16 {
		return "", errors.New("Name must be 2-16 characters.")
	}
	if cleanName(s) != s {
		return "", errors.New("Use only letters, numbers, spaces and . - _ ' in your name.")
	}
	if reservedIGN[strings.ToLower(s)] {
		return "", errors.New("That name is reserved. Pick another.")
	}
	return s, nil
}

// ignTaken reports whether another account already owns the name (a.mu must be held).
func (a *Accounts) ignTaken(name, self string) bool {
	for _, u := range a.users {
		if u.IGN != "" && u.Email != self && strings.EqualFold(u.IGN, name) {
			return true
		}
	}
	return false
}

// ignTakenOffline also honours names that older versions of the game already tied to another account.
func ignTakenOffline(name, email string) bool {
	return offl != nil && offl.ownedByOther(name, email)
}

func (a *Accounts) handleIGNCheck(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	if cur := a.ignOf(email); cur != "" {
		writeJSON(w, 200, map[string]interface{}{"ok": false, "name": cur, "error": "Your in-game name is already set and cannot be changed."})
		return
	}
	name, err := normIGN(r.URL.Query().Get("name"))
	if err != nil {
		writeJSON(w, 200, map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}
	a.mu.Lock()
	taken := a.ignTaken(name, email)
	a.mu.Unlock()
	if taken || ignTakenOffline(name, email) {
		writeJSON(w, 200, map[string]interface{}{"ok": false, "name": name, "error": "\"" + name + "\" is already taken. Try another name."})
		return
	}
	writeJSON(w, 200, map[string]interface{}{"ok": true, "name": name})
}

func (a *Accounts) handleIGNSet(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		fail(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	var in struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&in); err != nil {
		fail(w, http.StatusBadRequest, "Bad request.")
		return
	}
	name, err := normIGN(in.Name)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	offTaken := ignTakenOffline(name, email)
	a.mu.Lock()
	u := a.users[email]
	switch {
	case u == nil:
		a.mu.Unlock()
		fail(w, http.StatusUnauthorized, "Please log in again.")
		return
	case u.IGN != "":
		a.mu.Unlock()
		fail(w, http.StatusConflict, "Your in-game name is already set and cannot be changed.")
		return
	case offTaken || a.ignTaken(name, email): // checked and claimed under one lock, so two players cannot grab the same name
		a.mu.Unlock()
		fail(w, http.StatusConflict, "\""+name+"\" is already taken. Try another name.")
		return
	}
	u.IGN = name
	a.dirty = true
	a.mu.Unlock()
	a.flush()
	if offl != nil {
		offl.claim(name, email)
	}
	log.Printf("%s chose the permanent name %q", email, name)
	writeJSON(w, 200, map[string]string{"ign": name})
}

// flushActive asks a live game session of this account to save right now and waits briefly for that save to arrive,
// so a login on a second device starts from the newest progress instead of the last timer save.
func (a *Accounts) flushActive(email string) {
	if theHub == nil {
		return
	}
	a.mu.Lock()
	before := a.saveSeq[email]
	a.mu.Unlock()
	reply := make(chan bool, 1)
	select {
	case theHub.in <- evt{kind: evFlush, msg: []byte(email), reply: reply}:
	default:
		return
	}
	select {
	case found := <-reply:
		if !found {
			return
		}
	case <-time.After(500 * time.Millisecond):
		return
	}
	for i := 0; i < 30; i++ {
		a.mu.Lock()
		now := a.saveSeq[email]
		a.mu.Unlock()
		if now != before {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
}

func (a *Accounts) handleLoad(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	a.flushActive(email)
	a.mu.Lock()
	save := a.users[email].Save
	a.mu.Unlock()
	if len(save) == 0 {
		save = json.RawMessage("null")
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(save)
}

func (a *Accounts) handleSave(w http.ResponseWriter, r *http.Request) {
	email, ok := a.authed(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		fail(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxSave))
	if err != nil || !json.Valid(b) {
		fail(w, http.StatusBadRequest, "Bad save.")
		return
	}
	a.mu.Lock()
	a.users[email].Save = json.RawMessage(b)
	if a.saveSeq == nil {
		a.saveSeq = map[string]int64{}
	}
	a.saveSeq[email]++
	a.dirty = true
	a.mu.Unlock()
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (a *Accounts) routes(mux *http.ServeMux) {
	mux.HandleFunc("/api/register", a.handleRegister)
	mux.HandleFunc("/api/login", a.handleLogin)
	mux.HandleFunc("/api/me", a.handleMe)
	mux.HandleFunc("/api/ign/check", a.handleIGNCheck)
	mux.HandleFunc("/api/ign", a.handleIGNSet)
	mux.HandleFunc("/api/load", a.handleLoad)
	mux.HandleFunc("/api/save", a.handleSave)
	mux.HandleFunc("/api/forgot", a.handleForgot)
	mux.HandleFunc("/api/reset", a.handleReset)
	mux.HandleFunc("/api/wallet", a.handleWallet)
	mux.HandleFunc("/api/redeem", a.handleRedeem)
	mux.HandleFunc("/api/exchange", a.handleExchange)
}

/* ---------------------------------------------------------------- forgot / reset password */

const (
	resetTTL      = 15 * time.Minute
	resetCooldown = 60 * time.Second
	resetMaxTries = 5
)

func sixDigits() string {
	var b [4]byte
	rand.Read(b[:])
	return fmt.Sprintf("%06d", binary.BigEndian.Uint32(b[:])%1000000)
}

func (a *Accounts) handleForgot(w http.ResponseWriter, r *http.Request) {
	in, ok := readCreds(w, r)
	if !ok {
		return
	}
	if !a.throttle(clientIP(r)) {
		fail(w, http.StatusTooManyRequests, "Too many attempts. Wait a minute and try again.")
		return
	}
	email, err := parseEmail(in.Email)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	a.mu.Lock()
	_, exists := a.users[email]
	var code string
	if exists {
		if old := a.resets[email]; old == nil || time.Since(old.sent) >= resetCooldown {
			code = sixDigits()
			a.resets[email] = &resetCode{code: code, exp: time.Now().Add(resetTTL), sent: time.Now()}
		}
	}
	for k, v := range a.resets { // drop expired codes
		if time.Now().After(v.exp) {
			delete(a.resets, k)
		}
	}
	a.mu.Unlock()
	if code != "" {
		go func() {
			body := "Someone asked to reset the password for your World of Ascension account.\n\n" +
				"Your reset code is: " + code + "\n\n" +
				"It works for 15 minutes. Enter it on the title screen (Forgot password) together with a new password.\n" +
				"If you did not ask for this, ignore this email - your password has not changed.\n"
			if !mailCfg.enabled() {
				log.Printf("PASSWORD RESET CODE for %s: %s (email is not configured - use -smtp-host to send it)", email, code)
				return
			}
			if err := sendMail(email, "World of Ascension password reset code", body); err != nil {
				log.Printf("could not email reset code to %s: %v", email, err)
			}
		}()
	}
	// same answer whether or not the account exists
	writeJSON(w, 200, map[string]bool{"ok": true})
}

type resetIn struct {
	Email    string `json:"email"`
	Code     string `json:"code"`
	Password string `json:"password"`
}

func (a *Accounts) handleReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		fail(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	var in resetIn
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&in); err != nil {
		fail(w, http.StatusBadRequest, "Bad request.")
		return
	}
	if !a.throttle(clientIP(r)) {
		fail(w, http.StatusTooManyRequests, "Too many attempts. Wait a minute and try again.")
		return
	}
	email, err := parseEmail(in.Email)
	if err != nil {
		fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(in.Password) < 8 {
		fail(w, http.StatusBadRequest, "Password must be at least 8 characters.")
		return
	}
	if len(in.Password) > 128 {
		fail(w, http.StatusBadRequest, "Password is too long (128 max).")
		return
	}
	bad := "That code is wrong or has expired. Ask for a new one."
	a.mu.Lock()
	rc := a.resets[email]
	u := a.users[email]
	if rc == nil || u == nil || time.Now().After(rc.exp) || rc.tries >= resetMaxTries {
		delete(a.resets, email)
		a.mu.Unlock()
		fail(w, http.StatusBadRequest, bad)
		return
	}
	rc.tries++
	if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(in.Code)), []byte(rc.code)) != 1 {
		a.mu.Unlock()
		fail(w, http.StatusBadRequest, bad)
		return
	}
	delete(a.resets, email)
	a.mu.Unlock()
	salt := make([]byte, 16)
	rand.Read(salt)
	hash := pbkdf2([]byte(in.Password), salt, pbkdfIter, 32)
	a.mu.Lock()
	u.Salt, u.Hash = hex.EncodeToString(salt), hex.EncodeToString(hash)
	a.dirty = true
	a.mu.Unlock()
	a.flush()
	log.Printf("password reset for %s", email)
	writeJSON(w, 200, map[string]string{"token": a.makeToken(email), "email": email})
}
