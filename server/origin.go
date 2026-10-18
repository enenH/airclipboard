package server

import "strings"

var allowedOrigins = map[string]bool{}

// SetAllowedOrigins is called once, before accepting requests.
func SetAllowedOrigins(origins []string) {
	allowedOrigins = make(map[string]bool)
	for _, origin := range origins {
		allowedOrigins[strings.TrimSpace(origin)] = true
	}
}

func IsAllowedOrigin(origin string) bool {
	return allowedOrigins[origin]
}
