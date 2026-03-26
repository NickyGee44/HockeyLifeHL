# League Builder Demo Video

Remotion workspace for product demo videos.

## Commands

From the repo root:

```bash
pnpm install
pnpm dev:demo-video
pnpm render:demo-video
pnpm render:demo-video:wide
pnpm render:demo-video:square
pnpm --filter @hockey-life/league-builder-demo render:wide
pnpm --filter @hockey-life/league-builder-demo render:square
pnpm --filter @hockey-life/league-builder-demo render:poster
```

## Compositions

- `LeagueBuilderVertical`: 1080x1920 reel-style product demo
- `LeagueBuilderWide`: 1920x1080 product overview using the same scenes
- `LeagueBuilderSquare`: 1080x1080 square cut for feed posts

## Notes

- The scene system is reusable, so future reels can swap copy and timing without rebuilding the package.
- The current compositions include a generated voiceover track and on-screen captions for previewing pacing.
