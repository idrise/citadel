#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUTLER_API_KEY:-}" ]]; then
  echo 'Missing BUTLER_API_KEY. Add it in repository Settings > Secrets and variables > Actions.' >&2
  exit 1
fi

if [[ ! "${ITCH_IO_TARGET:-}" =~ ^[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*$ ]]; then
  echo 'ITCH_IO_TARGET must be a lowercase itch.io username/game-slug (without a URL or channel).' >&2
  exit 1
fi

channel="${ITCH_IO_CHANNEL:-html5}"
if [[ ! "$channel" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo 'ITCH_IO_CHANNEL must contain lowercase letters, digits and dashes.' >&2
  exit 1
fi

if [[ -z "${ITCH_IO_VERSION:-}" ]]; then
  echo 'Missing ITCH_IO_VERSION; use the build commit SHA.' >&2
  exit 1
fi

if [[ ! -f dist-itch/index.html ]]; then
  echo 'Missing dist-itch/index.html; build or download the validated itch artifact first.' >&2
  exit 1
fi

exec butler push dist-itch "${ITCH_IO_TARGET}:${channel}" --userversion "$ITCH_IO_VERSION"
