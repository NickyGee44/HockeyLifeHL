# WIP Checkpoint (Crash Resilience)

> **Use when:** you've done significant work and want to save progress before a long operation, end of session, or anytime you'd be upset losing current changes
> **Don't use when:** you're ready for a clean, final commit (use `/review` then commit normally), or deploying (use `/ship`)
> **Outputs:** a WIP commit pushed to remote, work log updated

---

Save current work as a resumable checkpoint. This is NOT a clean commit — it's a safety net.

## 1. Survey Changes
- Run `git status` to see all modified, staged, and untracked files
- Run `git diff --stat` to see scope of changes
- Count files changed and categorize: code, config, docs, tests

## 2. Secrets Scan (MANDATORY)
- Run `git diff` and scan for: `eyJ`, `sk_live_`, `sk_test_`, `whsec_`, `sbp_`, `password`, `secret`
- Check that NO `.env` files are in the changeset
- **If ANY secret found: STOP and warn the user. Do NOT proceed.**

## 3. Stage Files Safely
- Stage files by name (NEVER `git add .` or `git add -A`)
- Group by category for readability
- Skip any files that contain secrets, `.env` files, or build artifacts
- For large changesets, stage in logical groups

## 4. Create WIP Commit
- Use this commit message format:
  ```
  wip: checkpoint - [brief description of what's in progress]

  Files: [count] modified, [count] new, [count] deleted

  This is a work-in-progress checkpoint, not a final commit.
  Run `git log --oneline -5` to see context when resuming.
  ```
- Example: `wip: checkpoint - skill routing headers and agent config updates`

## 5. Push to Remote
- Run `git push origin [current-branch]` to save to remote
- If push fails (upstream not set), run `git push -u origin [current-branch]`
- Verify push succeeded

## 6. Update Work Log
- Find or create today's work log in `.claude/work-logs/`
- Add a checkpoint entry with:
  - Timestamp
  - Files included
  - What was in progress
  - What remains to be done
  - Commit hash for reference

## 7. Report
- Output: "Checkpoint saved: [commit hash]"
- List what was saved
- List what was NOT saved (if anything was skipped)
- Remind: "To resume, run `git log --oneline -5` to see where you left off"

---

## Resuming After a Crash

When starting a new session after a crash:
1. Run `git log --oneline -10` to find the last WIP checkpoint
2. Check `.claude/work-logs/` for the session log
3. Run `git status` to see if there's uncommitted work on top of the checkpoint
4. Continue working — the WIP commit can be squashed into clean commits later with `git rebase -i`
