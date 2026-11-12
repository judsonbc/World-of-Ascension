package main

// Outgoing email (password reset codes). Standard library only (net/smtp).
// Configure with flags or environment variables (flags win):
//   -smtp-host / ALOTUS_SMTP_HOST   e.g. smtp.gmail.com
//   -smtp-port / ALOTUS_SMTP_PORT   587 (STARTTLS, default) or 465 (implicit TLS)
//   -smtp-user / ALOTUS_SMTP_USER   login, usually the full email address
//   -smtp-pass / ALOTUS_SMTP_PASS   password or app password
//   -smtp-from / ALOTUS_SMTP_FROM   From address (defaults to the user)
// If no host is set, reset codes are printed in the server console instead of emailed.

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"
)

type mailConfig struct {
	host, port, user, pass, from string
}

var mailCfg mailConfig

func envOr(flagVal, env string) string {
	if flagVal != "" {
		return flagVal
	}
	return os.Getenv(env)
}

func (c mailConfig) enabled() bool { return c.host != "" }

func sendMail(to, subject, body string) error {
	c := mailCfg
	if !c.enabled() {
		return errors.New("smtp not configured")
	}
	if c.port == "" {
		c.port = "587"
	}
	from := c.from
	if from == "" {
		from = c.user
	}
	if strings.ContainsAny(to+subject+from, "\r\n") {
		return errors.New("bad header")
	}
	msg := "From: World of Ascension <" + from + ">\r\nTo: " + to + "\r\nSubject: " + subject +
		"\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nDate: " + time.Now().Format(time.RFC1123Z) +
		"\r\n\r\n" + strings.ReplaceAll(body, "\n", "\r\n")
	addr := net.JoinHostPort(c.host, c.port)
	var auth smtp.Auth
	if c.user != "" {
		auth = smtp.PlainAuth("", c.user, c.pass, c.host)
	}
	if c.port != "465" {
		return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg)) // STARTTLS when the server offers it
	}
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 15 * time.Second}, "tcp", addr, &tls.Config{ServerName: c.host})
	if err != nil {
		return err
	}
	cl, err := smtp.NewClient(conn, c.host)
	if err != nil {
		return err
	}
	defer cl.Close()
	if auth != nil {
		if err := cl.Auth(auth); err != nil {
			return err
		}
	}
	if err := cl.Mail(from); err != nil {
		return err
	}
	if err := cl.Rcpt(to); err != nil {
		return err
	}
	w, err := cl.Data()
	if err != nil {
		return err
	}
	if _, err := fmt.Fprint(w, msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return cl.Quit()
}
