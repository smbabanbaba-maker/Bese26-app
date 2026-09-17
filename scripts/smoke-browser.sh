#!/usr/bin/env bash
set -euo pipefail
url="${1:-http://127.0.0.1:4173/}"
out="${2:-/tmp/bese26-headless.html}"
err="${3:-/tmp/bese26-headless.err}"
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=5000 --dump-dom "$url" >"$out" 2>"$err" || true
printf 'dom_bytes='; wc -c <"$out"
printf 'root_bytes='; grep -o '<div id="root">.*</div>' "$out" | wc -c
printf 'body_text='; sed 's/<[^>]*>/ /g' "$out" | tr -s ' ' | cut -c1-240; printf '\n'
printf '%s\n' '--- browser stderr ---'; tail -40 "$err"
