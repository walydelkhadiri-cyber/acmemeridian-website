#!/usr/bin/env bash
# =============================================================================
# Create (or re-password) the one account that can open /admin/.
#
# Run it yourself. The password is read with the terminal echo off, is never
# passed as an argument, and therefore never reaches your shell history, the
# process list, or anyone reading over your shoulder — including whoever set
# this script up. Supabase stores only a bcrypt hash of it.
#
#   ./tools/create_admin.sh
#
# Re-running it on an address that already exists sets a new password for that
# account instead of failing, which is how you rotate it.
# =============================================================================
set -euo pipefail

REF="slkyivycuxbjigwqpyzd"
API="https://${REF}.supabase.co/auth/v1"

command -v supabase >/dev/null || { echo "supabase CLI not found."; exit 1; }
command -v python3  >/dev/null || { echo "python3 not found."; exit 1; }

echo "Fetching the service key for ${REF}…"
SERVICE_KEY="$(supabase projects api-keys --project-ref "$REF" -o json 2>/dev/null \
  | python3 -c 'import json,sys
for k in json.load(sys.stdin):
    if k.get("name") == "service_role":
        print(k["api_key"]); break')"
[ -n "$SERVICE_KEY" ] || { echo "Could not read the service key. Run: supabase login"; exit 1; }

read -r -p "Admin email: " EMAIL
[ -n "$EMAIL" ] || { echo "An email is required."; exit 1; }

read -r -s -p "Password (min 12 characters): " PW; echo
read -r -s -p "Again: " PW2; echo
[ "$PW" = "$PW2" ]      || { echo "They do not match."; exit 1; }
[ ${#PW} -ge 12 ]       || { echo "Too short — 12 characters minimum."; exit 1; }

# The helper is written out first. Two stdin redirections on one command cannot
# both win, so the program goes in a file and stdin is left free for the secret.
HELPER="$(mktemp -t meridian_admin)"
trap 'rm -f "$HELPER"' EXIT
cat > "$HELPER" <<'PY'
import json, os, sys, urllib.request, urllib.error

pw    = sys.stdin.readline().rstrip("\n")
email = os.environ["EMAIL"]
api   = os.environ["API"]
key   = os.environ["KEY"]
hdr   = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}

def call(method, path, body=None):
    req = urllib.request.Request(
        api + path, method=method, headers=hdr,
        data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

# app_metadata is the part a user cannot write to themselves, which is exactly
# why the admin function trusts it and not anything in user_metadata.
payload = {
    "email": email,
    "password": pw,
    "email_confirm": True,
    "app_metadata": {"role": "admin"},
}

status, body = call("POST", "/admin/users", payload)

if status >= 400 and "already" in json.dumps(body).lower():
    # find them and set the new password instead
    st, lst = call("GET", "/admin/users?per_page=200")
    user = next((u for u in lst.get("users", []) if u.get("email", "").lower() == email.lower()), None)
    if not user:
        print("EXISTS_BUT_NOT_FOUND"); sys.exit(1)
    status, body = call("PUT", "/admin/users/" + user["id"],
                        {"password": pw, "app_metadata": {"role": "admin"}})
    action = "updated"
else:
    action = "created"

if status >= 400:
    print("FAIL " + json.dumps(body)); sys.exit(1)
print(f"OK {action} {body.get('id','')} {body.get('email','')}")
PY

# The password goes over stdin, not the command line: an argument would be
# visible to anyone running ps while this executes.
RESULT="$(EMAIL="$EMAIL" API="$API" KEY="$SERVICE_KEY" python3 "$HELPER" <<<"$PW")"

unset PW PW2

case "$RESULT" in
  OK\ *) echo; echo "✓ ${RESULT#OK }"; echo
         echo "Sign in at https://acmemeridian.com/admin/" ;;
  *)     echo; echo "✗ $RESULT"; exit 1 ;;
esac
