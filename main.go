package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

//go:embed web
var webFS embed.FS

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}

func main() {
	port := flag.Int("port", 8080, "port to listen on")
	lan := flag.Bool("lan", true, "let friends on your network join (use -lan=false for this computer only)")
	noOpen := flag.Bool("no-browser", false, "do not open the browser automatically")
	smtpHost := flag.String("smtp-host", "", "SMTP server used to email password-reset codes (or ALOTUS_SMTP_HOST)")
	smtpPort := flag.String("smtp-port", "", "SMTP port: 587 (default, STARTTLS) or 465 (TLS) (or ALOTUS_SMTP_PORT)")
	smtpUser := flag.String("smtp-user", "", "SMTP login (or ALOTUS_SMTP_USER)")
	smtpPass := flag.String("smtp-pass", "", "SMTP password / app password (or ALOTUS_SMTP_PASS)")
	smtpFrom := flag.String("smtp-from", "", "From address (or ALOTUS_SMTP_FROM; defaults to the SMTP login)")
	admin := flag.String("admin", "", "comma-separated account emails allowed to use /commands in chat (or ALOTUS_ADMIN)")
	couponNew := flag.Int("coupon-new", 0, "create this many coupon codes, print them and exit (see -coupon-gold, -coupon-note)")
	couponGold := flag.Int("coupon-gold", 100, "gold each new coupon is worth")
	couponNote := flag.String("coupon-note", "", "label saved with the new coupons (e.g. the shop or batch name)")
	couponList := flag.Bool("coupon-list", false, "list every coupon code and whether it has been used, then exit")
	flag.Parse()
	if *couponNew > 0 || *couponList {
		if *couponNew > 0 {
			if *couponNew > couponMaxN || *couponGold < 1 || *couponGold > 1000000 {
				fmt.Printf("-coupon-new must be 1-%d and -coupon-gold 1-1000000\n", couponMaxN)
				os.Exit(1)
			}
			codes, err := genCoupons(*couponNew, int64(*couponGold), *couponNote)
			if err != nil {
				fmt.Println("cannot create coupons:", err)
				os.Exit(1)
			}
			for _, c := range codes {
				fmt.Println(c)
			}
			fmt.Fprintf(os.Stderr, "%d codes worth %d gold each saved to %s\n", len(codes), *couponGold, couponsFile)
			return
		}
		if err := listCoupons(); err != nil {
			fmt.Println("cannot read coupons:", err)
			os.Exit(1)
		}
		return
	}
	for _, e := range strings.Split(*admin+","+os.Getenv("ALOTUS_ADMIN"), ",") {
		if e = strings.ToLower(strings.TrimSpace(e)); e != "" {
			adminSet[e] = true
			fmt.Println("Admin commands enabled for", e)
		}
	}
	mailCfg = mailConfig{
		host: envOr(*smtpHost, "ALOTUS_SMTP_HOST"), port: envOr(*smtpPort, "ALOTUS_SMTP_PORT"),
		user: envOr(*smtpUser, "ALOTUS_SMTP_USER"), pass: envOr(*smtpPass, "ALOTUS_SMTP_PASS"), from: envOr(*smtpFrom, "ALOTUS_SMTP_FROM"),
	}

	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatal(err)
	}
	accts = loadAccounts()
	offl = loadOffline()
	frs = loadFriends()
	hub := newHub()
	theHub = hub
	go hub.run()
	mux := http.NewServeMux()
	accts.routes(mux)
	mux.HandleFunc("/ws", hub.serveWS)
	mux.Handle("/", newStaticHandler(sub))

	host := "127.0.0.1"
	if *lan {
		host = "0.0.0.0"
	}
	// Try the requested port first; if it is already in use, try the next ones, then let the OS pick a free port.
	var ln net.Listener
	for i := 0; i <= 50; i++ {
		ln, err = net.Listen("tcp", fmt.Sprintf("%s:%d", host, *port+i))
		if err == nil {
			break
		}
	}
	if err != nil {
		ln, err = net.Listen("tcp", host+":0")
	}
	if err != nil {
		log.Fatalf("cannot listen on %s: %v", host, err)
	}
	actual := ln.Addr().(*net.TCPAddr).Port
	if actual != *port {
		fmt.Printf("Port %d is already in use - using port %d instead.\n", *port, actual)
	}
	*port = actual

	local := fmt.Sprintf("http://localhost:%d", *port)
	fmt.Println("World of Ascension MULTIPLAYER server running")
	fmt.Println("  Build: PvP arena = Arena (World 0) (players only, no monsters)")
	fmt.Println("  Play here:   ", local)
	if *lan {
		if addrs, _ := net.InterfaceAddrs(); addrs != nil {
			for _, a := range addrs {
				if ipn, ok := a.(*net.IPNet); ok && ipn.IP.To4() != nil && !ipn.IP.IsLoopback() {
					fmt.Printf("  On your network: http://%s:%d\n", ipn.IP, *port)
				}
			}
		}
	}
	if mailCfg.enabled() {
		fmt.Println("  Password reset emails: via", mailCfg.host)
	} else {
		fmt.Println("  Password reset emails: NOT configured (codes print in this window). Use -smtp-host, -smtp-user, -smtp-pass.")
	}
	fmt.Println("Close this window or press Ctrl+C to stop.")

	if !*noOpen {
		go func() { time.Sleep(400 * time.Millisecond); openBrowser(local) }()
	}
	log.Fatal(http.Serve(ln, mux))
}
