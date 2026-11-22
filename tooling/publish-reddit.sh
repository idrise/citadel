#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEVVIT_AUTH_TOKEN:-}" ]]; then
  echo "Missing DEVVIT_AUTH_TOKEN. Add the complete Devvit token file as a repository Actions secret." >&2
  exit 1
fi

# Fail authentication before starting the build/upload; never print the token.
vp exec devvit whoami
# Devvit runs the configured build hook and assigns the next private app version.
vp run reddit:upload
