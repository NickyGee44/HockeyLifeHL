# App Store Connect — Privacy Questionnaire Notes

This file documents the correct answers for the **App Privacy** section in App Store Connect
for the HockeyLifeHL mobile app.

> Last updated: 2026-03-01
> Analytics SDK: PostHog React Native (`posthog-react-native`)
> PostHog host: `https://us.i.posthog.com`

---

## Does this app collect data?

**YES** — PostHog collects analytics data for product improvement and crash diagnosis.

---

## Data Types & Answers

### Analytics Data

| Question | Answer | Notes |
|---|---|---|
| Collect analytics data? | **YES** | PostHog tracks events, screen views, feature flags |
| Data linked to user? | **NO** | PostHog uses `identified_only` capture mode — only logged-in users are identified by their app user ID. Anonymous sessions are not linked. |
| Data used to track across apps/sites? | **NO** | PostHog is not used for cross-app ad tracking. `NSPrivacyTracking = false`. |

### Device ID

| Question | Answer | Notes |
|---|---|---|
| Collect device ID? | **YES** | PostHog uses an anonymous distinct ID per device for session continuity |
| Data linked to user? | **NO** | Distinct ID is random UUID, not tied to Apple ID or PII |
| Data used to track? | **NO** | Not used for advertising or cross-app tracking |

### Crash Data

| Question | Answer | Notes |
|---|---|---|
| Collect crash data? | **YES** | PostHog captures exceptions and error events |
| Data linked to user? | **NO** | Crash reports are not linked to personal identity |
| Data used to track? | **NO** | Used only for app stability / bug fixes |

---

## Data NOT Collected

The following data types are **NOT** collected by this app:

- Name, email, phone, physical address, or any contact info (not sent to PostHog)
- Health or fitness data
- Financial info
- Location data
- Browsing/search history
- Sensitive info
- Photos, videos, audio
- Contacts, calendars, messages

---

## Privacy Manifest

The `PrivacyInfo.xcprivacy` file in `ios/` declares all of the above for Apple's
required privacy manifest review. The source of truth for Expo CNG builds is
`app.json → expo.ios.privacyManifests`.

Key declarations:
- `NSPrivacyTracking: false` — not an ad-tracking app
- `NSPrivacyTrackingDomains: [us.i.posthog.com]` — PostHog ingestion domain
- `NSPrivacyCollectedDataTypes`: DeviceID, ProductInteraction, CrashData (all unlinked, non-tracking)
- `NSPrivacyAccessedAPITypes`: UserDefaults, FileTimestamp, SystemBootTime, DiskSpace (React Native / Expo core)

---

## PostHog Configuration Reference

PostHog should be initialized with `captureMode: 'identified_only'` (or the default
which does not send PII) to stay consistent with these declarations. Ensure no
personally identifiable information (name, email, phone) is passed as PostHog
person properties unless the user is explicitly opted in.
