# Beer League Hockey Native iOS

This folder contains the native SwiftUI rebuild of the mobile app.

## Validation baseline

- Windows is authoring-only for this native target.
- All iOS simulator download, build, launch, and smoke validation run on macOS.
- CI uses `macos-15` and Xcode `26.3` (`/Applications/Xcode_26.3.app`) to keep the toolchain deterministic.
- The standard simulator target is `iPhone 16` on the latest installed iOS simulator runtime, with `iOS 26.2` as the pinned baseline expected in CI.

## What is included

- A native iOS app shell built with SwiftUI and Observation.
- A project definition for XcodeGen so the project can be generated on macOS.
- Core tabs and detail flows mapped from the current Expo app.
- Sample data that mirrors the current product shape while the live data layer is ported.
- Shared validation scripts for local Mac smoke testing and GitHub Actions CI.

## Prerequisites on Mac

1. Install Xcode `26.3`.
2. Install Xcode command line tools:

```bash
xcode-select --install
```

3. Open Xcode once and accept the license if prompted.
4. Install XcodeGen:

```bash
brew install xcodegen
```

5. Download the pinned simulator runtime in Xcode:
   - Open `Xcode > Settings > Components`.
   - In the `Simulators` pane, download the `iOS 26.2` runtime if it is not already installed.
   - If `iPhone 16` is not already available after the runtime finishes installing, create it in Simulator or let the smoke script create it automatically.

## Generate the Xcode project

On a Mac with Xcode installed:

```bash
cd apps/ios
bash scripts/generate_project.sh
open BeerLeagueHockey.xcodeproj
```

The project definition in [project.yml](D:\B3\dev\HockeyLifeHL\apps\ios\project.yml) is the source of truth. Do not commit a generated `.xcodeproj`.

## Local build and simulator smoke test

Run the full native validation flow:

```bash
cd apps/ios
bash scripts/smoke_test_sim.sh
```

What this script does:

- selects Xcode `26.3`
- generates the project from `project.yml`
- reuses or creates the preferred simulator
- boots the simulator
- builds the `BeerLeagueHockey` scheme for Debug
- installs the app
- launches the app and verifies it stays alive through the smoke window
- relaunches the app for manual inspection when not running in CI

## Manual smoke checklist

After the script leaves the app open locally, verify:

1. Home renders with the league switcher and next-game card.
2. Open each visible tab once.
3. Switch leagues from the league menu.
4. Open one game detail from Home or Schedule.
5. Open Team Detail, Team Chat, Notifications, and one Captain screen.
6. Confirm there is no immediate crash, blank screen, or broken navigation.

## CI contract

- GitHub Actions runs a required `ios-native` macOS job in [ci.yml](D:\B3\dev\HockeyLifeHL\.github\workflows\ci.yml).
- CI calls the same `generate_project.sh` and `smoke_test_sim.sh` entrypoints used locally.
- On failure, CI uploads simulator artifacts, including a screenshot and captured logs.

## Notes

- The app targets iOS 17+ and uses `@Observable` / `@Environment`.
- The current source is intentionally sample-data driven so the UI, navigation, and app structure can stabilize before the Supabase networking layer is ported.
