#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CONNECTION_URL:-}" || -z "${REQUEST_ID:-}" ]]; then
  echo "Defina CONNECTION_URL e REQUEST_ID."
  exit 2
fi

psql "$CONNECTION_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select public.accept_trip_request('$REQUEST_ID'::uuid);" &
PID_A=$!
psql "$CONNECTION_URL" -v ON_ERROR_STOP=1 -c "set role authenticated; select public.accept_trip_request('$REQUEST_ID'::uuid);" &
PID_B=$!

wait "$PID_A" || true
wait "$PID_B" || true
