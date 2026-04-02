#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "generate_project.sh must be run on macOS." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_SPEC="${IOS_DIR}/project.yml"
PROJECT_NAME="${PROJECT_NAME:-BeerLeagueHockey}"
PROJECT_FILE="${IOS_DIR}/${PROJECT_NAME}.xcodeproj"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required. Install it with: brew install xcodegen" >&2
  exit 1
fi

if [[ ! -f "${PROJECT_SPEC}" ]]; then
  echo "Project spec not found at ${PROJECT_SPEC}" >&2
  exit 1
fi

cd "${IOS_DIR}"

echo "Generating ${PROJECT_NAME}.xcodeproj from ${PROJECT_SPEC}"
xcodegen generate --spec "${PROJECT_SPEC}"

if [[ ! -d "${PROJECT_FILE}" ]]; then
  echo "XcodeGen completed but ${PROJECT_FILE} was not created." >&2
  exit 1
fi

echo "Generated ${PROJECT_FILE}"
