#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:4002}
TENANT=${TENANT:-cafetaria-centrum}
PRINTER_ID=${PRINTER_ID:-}

pass() { echo "PASS  - $1 ($2)"; }
fail() { echo "FAIL  - $1 ($2)"; }
warn() { echo "WARN  - $1 ($2)"; }

curl_check() {
  local name=$1
  local method=$2
  local url=$3
  local data=${4:-}
  local headers=(-H "x-tenant-id: ${TENANT}")
  local tmp_body
  tmp_body=$(mktemp)
  local code

  if [[ -n "$data" ]]; then
    code=$(curl -sS -o "$tmp_body" -w "%{http_code}" -H 'Content-Type: application/json' "${headers[@]}" -X "$method" "$url" -d "$data" || true)
  else
    code=$(curl -sS -o "$tmp_body" -w "%{http_code}" "${headers[@]}" -X "$method" "$url" || true)
  fi

  >&2 echo "--- ${name} -> HTTP ${code}"
  if [[ -s "$tmp_body" ]]; then >&2 sed 's/.*/    &/' "$tmp_body"; fi

  echo "$code" > "$tmp_body.code"
  echo "$tmp_body"
}

overall_ok=1

# 1) Health
body_file=$(curl_check "health" GET "$BASE_URL/api/health")
code=$(cat "$body_file.code")
if [[ "$code" =~ ^2 ]]; then pass "health" "$code"; else overall_ok=0; fail "health" "$code"; fi
rm -f "$body_file" "$body_file.code"

# 2) List printers
body_file=$(curl_check "hardware.printers" GET "$BASE_URL/api/hardware/printers")
code=$(cat "$body_file.code")
if [[ "$code" =~ ^2 ]]; then pass "hardware.printers" "$code"; else overall_ok=0; fail "hardware.printers" "$code"; fi
rm -f "$body_file" "$body_file.code"

# 3) List print routes
body_file=$(curl_check "hardware.print-routes" GET "$BASE_URL/api/hardware/print-routes")
code=$(cat "$body_file.code")
if [[ "$code" =~ ^2 ]]; then pass "hardware.print-routes" "$code"; else overall_ok=0; fail "hardware.print-routes" "$code"; fi
rm -f "$body_file" "$body_file.code"

# 4) Test print via kind routing (RECEIPT)
body_file=$(curl_check "print.test-kind" POST "$BASE_URL/api/print/test-kind" '{"kind":"RECEIPT"}')
code=$(cat "$body_file.code")
if [[ "$code" =~ ^2 ]]; then pass "print.test-kind" "$code"; else overall_ok=0; fail "print.test-kind" "$code"; fi
rm -f "$body_file" "$body_file.code"

# 5) Print last receipt (allow 404 NO_PAID_ORDER as warning)
body_file=$(curl_check "print.receipt.last" POST "$BASE_URL/api/print/receipt/last")
code=$(cat "$body_file.code")
if [[ "$code" =~ ^2 ]]; then
  pass "print.receipt.last" "$code"
else
  if [[ "$code" == "404" ]] && grep -q 'NO_PAID_ORDER' "$body_file" 2>/dev/null; then
    warn "print.receipt.last (no last paid order)" "$code"
  else
    overall_ok=0; fail "print.receipt.last" "$code"
  fi
fi
rm -f "$body_file" "$body_file.code"

# 6) Optional: printer-specific test
if [[ -n "${PRINTER_ID}" ]]; then
  body_file=$(curl_check "hardware.printer.test" POST "$BASE_URL/api/hardware/printers/${PRINTER_ID}/test")
  code=$(cat "$body_file.code")
  if [[ "$code" =~ ^2 ]]; then pass "hardware.printer.test" "$code"; else overall_ok=0; fail "hardware.printer.test" "$code"; fi
  rm -f "$body_file" "$body_file.code"
fi

if [[ "$overall_ok" -eq 1 ]]; then
  echo "All smoke checks passed."
  exit 0
else
  echo "One or more smoke checks failed."
  exit 1
fi
