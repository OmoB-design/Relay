#!/usr/bin/env bash
#
# Copy the production environment from .env.local into Vercel.
#
#   bash scripts/push-env-to-vercel.sh
#
# WHY A SCRIPT AND NOT THE DASHBOARD. Two of these values are long enough to be
# mangled by a copy-paste, and one of them — the Google private key — must keep
# its literal \n escapes or the tracker read fails at runtime with an unhelpful
# error. Reading them out of the file that already works removes that whole
# class of mistake.
#
# NOTHING IS PRINTED. Values go from the file to Vercel's stdin. The script
# reports only names and lengths, so a shoulder-surfer or a scrollback buffer
# learns nothing, and nothing lands in shell history.
#
# WHAT IT DELIBERATELY DOES NOT COPY:
#
#   GOOGLE_SERVICE_ACCOUNT_KEY_FILE  points at secrets/, which is gitignored and
#     will not exist on Vercel. The reader PREFERS the file when the variable is
#     set, so copying it would make the working fallback unreachable — a silent
#     failure. The two variables below replace it.
#
#   NEXT_PUBLIC_SITE_URL  is localhost here, and invite emails build their links
#     from it. It is set separately, after the first deploy assigns a domain.
#
#   RELAY_PILOT_NOW  freezes the clock for the demo. Production must not have it.
#
#   The empty ones (Google Ads, Triple Whale, Anthropic) are skipped: Relay
#     treats a missing credential as "that integration is off", and an empty
#     string set explicitly is not the same thing as absent.
# USAGE:  bash scripts/push-env-to-vercel.sh [production|preview]
#
# PREVIEW IS A CONVENIENCE, NOT AN ISOLATION BOUNDARY. There is one Supabase
# project, so a preview deployment reads and writes the SAME database as
# production: confirming a row, adding a client, reassigning a buyer or
# uploading a logo from a branch are all real changes to real data.
#
# Bounded, though. The app never runs migrations, so no branch can change the
# schema. Vercel attaches crons to production deployments only, so no preview
# ever writes on a schedule. And SSO protection means only the Vercel team can
# open one.
#
# The day the agency puts real client numbers in, this stops being an
# acceptable trade and production needs its own Supabase project.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-production}"
case "$TARGET" in
  production|preview) ;;
  *) echo "Target must be 'production' or 'preview'." >&2; exit 1 ;;
esac

if [ ! -f .env.local ]; then echo "No .env.local here." >&2; exit 1; fi
if [ ! -f .vercel/project.json ]; then echo "Not linked — run: vercel link" >&2; exit 1; fi

val() { grep -m1 "^$1=" .env.local | cut -d= -f2- | sed 's/^"//;s/"$//'; }

add() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    printf '  skip    %s (empty — integration stays off)\n' "$name"
    return
  fi
  # --force overwrites, so the script is safe to re-run after rotating a key.
  if printf '%s' "$value" | vercel env add "$name" "$TARGET" --force >/dev/null 2>&1; then
    printf '  added   %s  (%s chars)\n' "$name" "${#value}"
  else
    printf '  FAILED  %s\n' "$name"
  fi
}

echo "Copying to Vercel ($TARGET):"
for name in \
  NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_ANON_KEY \
  SUPABASE_SERVICE_ROLE_KEY \
  GOOGLE_SHEETS_SPREADSHEET_ID \
  CRON_SECRET
do
  add "$name" "$(val "$name")"
done

# The service account, unpacked from the JSON the key-file variable points at.
key_file="$(val GOOGLE_SERVICE_ACCOUNT_KEY_FILE)"
if [ -n "$key_file" ] && [ -f "$key_file" ]; then
  add GOOGLE_SERVICE_ACCOUNT_EMAIL "$(node -p "require('./$key_file').client_email")"
  add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY "$(node -p "require('./$key_file').private_key")"
else
  echo "  skip    GOOGLE_SERVICE_ACCOUNT_* — no key file at '${key_file:-unset}'"
  echo "          The tracker will fall back to supabase/fixtures/tracker.json."
fi

if [ "$TARGET" = "preview" ]; then
  # NOT the branch URL. Invite emails build their links from this, and a preview
  # URL is SSO-protected — an invited buyer would hit a Vercel login wall and be
  # unable to reach the app at all. Pointing at production means an invite sent
  # by accident from a branch still lands somewhere that works.
  add NEXT_PUBLIC_SITE_URL "https://relay-sable-nine.vercel.app"
  echo "          ^ deliberately the PRODUCTION url — see the comment above"
  echo
  echo "Done. Push any branch and it will build."
  echo "Remember: previews share the production database."
else
  echo
  echo "Done. NEXT_PUBLIC_SITE_URL is NOT set yet — it needs the domain the first"
  echo "deploy assigns. Deploy, then:"
  echo
  echo "  printf '%s' 'https://YOUR-DOMAIN' | vercel env add NEXT_PUBLIC_SITE_URL production --force"
  echo "  vercel deploy --prod"
  echo
  echo "The second deploy is not optional: NEXT_PUBLIC_ values are inlined at"
  echo "build time, so the build that sets it must come after it exists."
fi
