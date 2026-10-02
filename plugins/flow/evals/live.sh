#!/usr/bin/env bash
# The live check for the mod's screens: Claude Code in tmux with this mod loaded, each moment
# opened from a real task state, the painted screen captured, then Jev's taste pass on every one.
#   plugins/flow/evals/live.sh [--turn] [--png] [--runs <n>] [moments...]
# Moments: idle new progress ready gate proof stuck, and working with --turn, which sends one real
# prompt (a model turn) so the line under the prompt is caught mid-turn and the permission-mode
# label is known. --png renders each capture with headless Chrome, for people. Captures land in
# $FLOW_LIVE_OUT (default <repo>/.scratch/flow-live), outside the mod so writing them never
# reloads it. Needs tmux, bun, and TYPESAFE_API_KEY for the Jev pass.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
plugin="$(cd "$here/.." && pwd)"
repo="$(cd "$plugin/../.." && pwd)"
turn=false png=false runs=1 moments=()
while [ $# -gt 0 ]; do
  case "$1" in
    --turn) turn=true ;;
    --png) png=true ;;
    --runs) runs="$2"; shift ;;
    *) moments+=("$1") ;;
  esac
  shift
done
[ ${#moments[@]} -eq 0 ] && moments=(idle new progress ready gate proof stuck)
TM="$(command -v tmux)"
sock="flow-live-$$"
cols="${COLS:-120}" rows="${ROWS:-50}"
out="${FLOW_LIVE_OUT:-$repo/.scratch/flow-live}"
work="$(mktemp -d)/work"
mkdir -p "$work" "$out"
rm -f "$out"/*.txt "$out"/*.ansi
(cd "$work" && git init -q && bun "$here/live-fixtures.ts" "$work" && echo "# spec" > .scratch/gate/spec.md)

cleanup() { "$TM" -L "$sock" kill-server 2>/dev/null || true; rm -rf "$(dirname "$work")"; }
trap cleanup EXIT
"$TM" -L "$sock" new-session -d -s live -x "$cols" -y "$rows" -c "$work" "claude --plugin-dir '$plugin' --dangerously-skip-permissions"
send() { "$TM" -L "$sock" send-keys -t live "$@"; }
grab() {
  "$TM" -L "$sock" capture-pane -p -t live > "$out/$1.txt"
  "$TM" -L "$sock" capture-pane -p -e -t live > "$out/$1.ansi"
}
for _ in $(seq 1 30); do
  sleep 1
  screen="$("$TM" -L "$sock" capture-pane -p -t live)"
  if grep -q "Yes, I trust" <<<"$screen"; then send Down; sleep 0.3; send Enter; fi
  if grep -q "for shortcuts\|permissions on\|mode on" <<<"$screen"; then break; fi
done
sleep 3

# A fresh session has no task open: idle comes first, before anything opens one.
if [[ " ${moments[*]} " == *" idle "* ]]; then grab idle; fi
if $turn; then
  send "/flow switch progress" Enter; sleep 2
  send "write the numbers 1 to 400 as words, one per line" Enter; sleep 9
  grab working
  sleep 60
  moments+=(working)
fi
for moment in "${moments[@]}"; do
  case "$moment" in
    idle | working) continue ;;
    new)
      send "/flow new" Enter; sleep 2
      send -l "Retry failed checkout payments up to 3 times with backoff"; sleep 2
      grab new
      send Escape; sleep 1
      ;;
    *)
      send "/flow switch $moment" Enter; sleep "${WAIT:-3}"
      send Escape; sleep 1
      grab "$moment"
      ;;
  esac
done

if $png; then
  chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  for one in "$out"/*.ansi; do
    html="${one%.ansi}.html"
    { echo '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1e1e2e;color:#cdd6f4}pre{margin:0;padding:16px;font:14px/1.25 Menlo,monospace;white-space:pre}</style><pre>'
      npx -y ansi-to-html@0.7 --newline --escapeXML < "$one" 2>/dev/null
      echo '</pre>'; } > "$html"
    # Headless Chrome can hang after it saves: give it 20s.
    perl -e 'alarm 20; exec @ARGV' "$chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=$((cols * 9 + 40)),$((rows * 18 + 40)) --screenshot="${one%.ansi}.png" "file://$html" >/dev/null 2>&1 || true
  done
fi

echo "captured: $(cd "$out" && ls ./*.txt | sed 's#./##; s#.txt##' | tr '\n' ' ')-> $out"
bun "$here/taste.ts" --runs "$runs" --live "$out"
