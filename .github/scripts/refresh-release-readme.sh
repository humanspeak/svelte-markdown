#!/usr/bin/env bash
# Keep the authenticated download private even if the caller enables tracing.
set +x
set -euo pipefail

if [[ -z ${GITHUB_TOKEN-} ]]; then
	echo "::warning::missing ecosystem updater download credential; skipping README refresh"
	exit 0
fi

UPDATER="${RUNNER_TEMP}/update-ecosystem-readme.mjs"
if curl -fsSL -H "Authorization: token ${GITHUB_TOKEN}" \
	https://raw.githubusercontent.com/humanspeak/docs-kit/882b87e6a73c408c6b31fe8a185e8d0ea397fa37/scripts/update-ecosystem-readme.mjs \
	-o "${UPDATER}"; then
	env -i PATH="${PATH}" node "${UPDATER}" || echo "::warning::ecosystem updater errored; README left unchanged"
else
	echo "::warning::could not fetch ecosystem updater; skipping README refresh"
fi
