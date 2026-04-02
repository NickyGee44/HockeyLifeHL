#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "smoke_test_sim.sh must be run on macOS." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

XCODE_APP_PATH="${XCODE_APP_PATH:-/Applications/Xcode_26.3.app}"
DEVELOPER_DIR="${DEVELOPER_DIR:-${XCODE_APP_PATH}/Contents/Developer}"
SCHEME="${SCHEME:-BeerLeagueHockey}"
PROJECT_NAME="${PROJECT_NAME:-BeerLeagueHockey}"
PROJECT_FILE="${IOS_DIR}/${PROJECT_NAME}.xcodeproj"
BUNDLE_ID="${BUNDLE_ID:-ca.beerleaguehockey.native}"
PREFERRED_DEVICE_NAME="${IOS_SIMULATOR_DEVICE:-iPhone 16}"
PREFERRED_RUNTIME_NAME="${IOS_RUNTIME_NAME:-iOS 26.2}"
SIMULATOR_NAME_OVERRIDE="${IOS_SIMULATOR_NAME:-}"
DERIVED_DATA_PATH="${IOS_DERIVED_DATA_PATH:-${IOS_DIR}/.derived-data}"
ARTIFACTS_DIR="${IOS_ARTIFACTS_DIR:-${IOS_DIR}/.artifacts/ios-smoke}"
SMOKE_WAIT_SECONDS="${IOS_SMOKE_WAIT_SECONDS:-5}"

SIMULATOR_ID=""
SELECTED_RUNTIME_NAME=""
SELECTED_DEVICE_NAME=""

mkdir -p "${ARTIFACTS_DIR}" "${DERIVED_DATA_PATH}"

collect_failure_artifacts() {
  mkdir -p "${ARTIFACTS_DIR}"

  {
    echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "XCODE_APP_PATH=${XCODE_APP_PATH}"
    echo "DEVELOPER_DIR=${DEVELOPER_DIR}"
    echo "SCHEME=${SCHEME}"
    echo "PROJECT_FILE=${PROJECT_FILE}"
    echo "BUNDLE_ID=${BUNDLE_ID}"
    echo "PREFERRED_DEVICE_NAME=${PREFERRED_DEVICE_NAME}"
    echo "PREFERRED_RUNTIME_NAME=${PREFERRED_RUNTIME_NAME}"
    echo "SELECTED_DEVICE_NAME=${SELECTED_DEVICE_NAME}"
    echo "SELECTED_RUNTIME_NAME=${SELECTED_RUNTIME_NAME}"
    echo "SIMULATOR_ID=${SIMULATOR_ID}"
  } > "${ARTIFACTS_DIR}/context.txt"

  xcodebuild -version > "${ARTIFACTS_DIR}/xcode-version.txt" 2>&1 || true
  xcrun simctl list devices > "${ARTIFACTS_DIR}/simctl-devices.txt" 2>&1 || true
  xcrun simctl list devicetypes > "${ARTIFACTS_DIR}/simctl-devicetypes.txt" 2>&1 || true
  xcrun simctl list runtimes > "${ARTIFACTS_DIR}/simctl-runtimes.txt" 2>&1 || true

  if [[ -n "${SIMULATOR_ID}" ]]; then
    xcrun simctl io "${SIMULATOR_ID}" screenshot "${ARTIFACTS_DIR}/failure-screenshot.png" >/dev/null 2>&1 || true
    xcrun simctl spawn "${SIMULATOR_ID}" log show --style compact --last 10m \
      > "${ARTIFACTS_DIR}/simulator-system.log" 2>&1 || true
  fi
}

trap 'status=$?; if [[ $status -ne 0 ]]; then collect_failure_artifacts; fi' EXIT

if [[ ! -d "${XCODE_APP_PATH}" ]]; then
  echo "Xcode app not found at ${XCODE_APP_PATH}" >&2
  exit 1
fi

export DEVELOPER_DIR

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to select a simulator runtime/device." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is not available under ${DEVELOPER_DIR}" >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is not available under ${DEVELOPER_DIR}" >&2
  exit 1
fi

bash "${SCRIPT_DIR}/generate_project.sh"

if [[ ! -d "${PROJECT_FILE}" ]]; then
  echo "Expected generated project at ${PROJECT_FILE}" >&2
  exit 1
fi

while IFS='=' read -r key value; do
  [[ -z "${key}" ]] && continue
  printf -v "${key}" "%s" "${value}"
done < <(
  python3 - "${PREFERRED_DEVICE_NAME}" "${PREFERRED_RUNTIME_NAME}" "${SIMULATOR_NAME_OVERRIDE}" <<'PY'
import json
import re
import subprocess
import sys

preferred_device = sys.argv[1]
preferred_runtime = sys.argv[2]
simulator_name_override = sys.argv[3]

def load_json(args):
    return json.loads(subprocess.check_output(args, text=True))

def version_key(value):
    digits = [int(part) for part in re.findall(r"\d+", value or "")]
    return tuple(digits) if digits else (0,)

def is_ios_runtime(runtime):
    platform = runtime.get("platform")
    identifier = runtime.get("identifier", "")
    name = runtime.get("name", "")
    return platform == "iOS" or ".iOS-" in identifier or name.startswith("iOS ")

def pick_runtime(runtimes, preferred_name):
    available = [runtime for runtime in runtimes if runtime.get("isAvailable") and is_ios_runtime(runtime)]
    if not available:
        raise SystemExit("No available iOS simulator runtimes were found.")

    exact = next((runtime for runtime in available if runtime.get("name") == preferred_name), None)
    if exact is not None:
        return exact

    return max(
        available,
        key=lambda runtime: version_key(runtime.get("version") or runtime.get("identifier") or runtime.get("name", "")),
    )

def base_iphone_candidates(device_types):
    candidates = []
    for device_type in device_types:
        name = device_type.get("name", "")
        if not name.startswith("iPhone "):
            continue
        if any(token in name for token in ("mini", "Plus", "Pro", "Max", "SE")):
            continue
        candidates.append(device_type)
    return candidates

def device_key(device_type):
    name = device_type.get("name", "")
    digits = version_key(name)
    return (digits, name)

def pick_device_type(device_types, preferred_name):
    exact = next((device_type for device_type in device_types if device_type.get("name") == preferred_name), None)
    if exact is not None:
        return exact

    fallback_order = [
        "iPhone 16",
        "iPhone 15",
        "iPhone 14",
        "iPhone 13",
        "iPhone 12",
        "iPhone 11",
    ]
    for candidate in fallback_order:
        match = next((device_type for device_type in device_types if device_type.get("name") == candidate), None)
        if match is not None:
            return match

    base_candidates = base_iphone_candidates(device_types)
    if base_candidates:
        return max(base_candidates, key=device_key)

    any_iphone = [device_type for device_type in device_types if device_type.get("name", "").startswith("iPhone ")]
    if any_iphone:
        return max(any_iphone, key=device_key)

    raise SystemExit("No iPhone simulator device types were found.")

runtimes = load_json(["xcrun", "simctl", "list", "--json", "runtimes"]).get("runtimes", [])
device_types = load_json(["xcrun", "simctl", "list", "--json", "devicetypes"]).get("devicetypes", [])
devices = load_json(["xcrun", "simctl", "list", "--json", "devices", "available"]).get("devices", {})

runtime = pick_runtime(runtimes, preferred_runtime)
device_type = pick_device_type(device_types, preferred_device)

runtime_name = runtime["name"]
device_name = device_type["name"]
simulator_name = simulator_name_override or f"BeerLeagueHockey-{device_name}-{runtime_name}"
simulator_name = simulator_name.replace(" ", "-").replace(".", "-")

existing = next(
    (device for device in devices.get(runtime["identifier"], []) if device.get("name") == simulator_name),
    None,
)

print(f"RUNTIME_ID={runtime['identifier']}")
print(f"RUNTIME_NAME={runtime_name}")
print(f"DEVICE_TYPE_ID={device_type['identifier']}")
print(f"DEVICE_NAME={device_name}")
print(f"SIMULATOR_NAME={simulator_name}")
print(f"SIMULATOR_ID={existing.get('udid', '') if existing else ''}")
PY
)

SELECTED_RUNTIME_NAME="${RUNTIME_NAME}"
SELECTED_DEVICE_NAME="${DEVICE_NAME}"

echo "Using Xcode from ${XCODE_APP_PATH}"
echo "Using simulator device ${DEVICE_NAME} on runtime ${RUNTIME_NAME}"

if [[ -z "${SIMULATOR_ID}" ]]; then
  echo "Creating simulator ${SIMULATOR_NAME}"
  SIMULATOR_ID="$(xcrun simctl create "${SIMULATOR_NAME}" "${DEVICE_TYPE_ID}" "${RUNTIME_ID}")"
else
  echo "Reusing simulator ${SIMULATOR_NAME} (${SIMULATOR_ID})"
fi

if [[ -z "${CI:-}" ]]; then
  open -a Simulator --args -CurrentDeviceUDID "${SIMULATOR_ID}" >/dev/null 2>&1 || true
fi

xcrun simctl boot "${SIMULATOR_ID}" >/dev/null 2>&1 || true
xcrun simctl bootstatus "${SIMULATOR_ID}" -b

BUILD_LOG="${ARTIFACTS_DIR}/xcodebuild.log"
LAUNCH_LOG="${ARTIFACTS_DIR}/launch.log"

xcodebuild \
  -project "${PROJECT_FILE}" \
  -scheme "${SCHEME}" \
  -configuration Debug \
  -destination "id=${SIMULATOR_ID}" \
  -derivedDataPath "${DERIVED_DATA_PATH}" \
  CODE_SIGNING_ALLOWED=NO \
  build | tee "${BUILD_LOG}"

APP_PATH="$(
  python3 - "${DERIVED_DATA_PATH}" <<'PY'
import sys
from pathlib import Path

products_dir = Path(sys.argv[1]) / "Build" / "Products"
matches = sorted(
    str(path)
    for path in products_dir.glob("**/*.app")
    if "iphonesimulator" in str(path)
)
print(matches[0] if matches else "")
PY
)"

if [[ -z "${APP_PATH}" ]]; then
  echo "Unable to locate a built simulator app under ${DERIVED_DATA_PATH}/Build/Products" >&2
  exit 1
fi

echo "Built app at ${APP_PATH}"

xcrun simctl uninstall "${SIMULATOR_ID}" "${BUNDLE_ID}" >/dev/null 2>&1 || true
xcrun simctl install "${SIMULATOR_ID}" "${APP_PATH}"
xcrun simctl launch "${SIMULATOR_ID}" "${BUNDLE_ID}" | tee "${LAUNCH_LOG}"

echo "Waiting ${SMOKE_WAIT_SECONDS}s to verify the app stays alive"
sleep "${SMOKE_WAIT_SECONDS}"

if ! xcrun simctl terminate "${SIMULATOR_ID}" "${BUNDLE_ID}" >/dev/null 2>&1; then
  echo "The app was no longer running after the smoke window. Treating this as a launch failure." >&2
  exit 1
fi

echo "Smoke launch passed"

if [[ -z "${CI:-}" ]]; then
  xcrun simctl launch "${SIMULATOR_ID}" "${BUNDLE_ID}" >/dev/null

  cat <<EOF
Local smoke checklist:
1. Home renders with the league switcher and next-game card.
2. Open each visible tab once.
3. Switch leagues from the league menu.
4. Open one game detail from Home or Schedule.
5. Open Team Detail, Team Chat, Notifications, and one Captain screen.
6. Confirm there is no immediate crash, blank screen, or broken navigation.
EOF
fi
