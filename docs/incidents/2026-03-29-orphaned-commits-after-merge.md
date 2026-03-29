# Incident: Orphaned Commits After PR Merge

**Date:** 2026-03-29
**Severity:** Medium — critical fix (AI object response handling) was not deployed for ~15 minutes

## What Happened

PR #14 was merged with only the first commit (`d8bee4d` — revert to simple prompt). Three subsequent commits were pushed to the same branch *after* the merge:

- `83eeabe` — the actual fix (handle object response)
- `bef876f` — restore language field
- `d81b1ec` — CLAUDE.md update

These commits sat on the orphaned branch and never reached `main`. A new PR #15 had to be created with cherry-picked changes.

## Why It Happened

1. The PR was created early with a partial fix
2. The user merged it while additional commits were still being pushed
3. No check was made to confirm all commits were included in the merge before moving on
4. GitHub merges the branch at the point of merge — later pushes to the same branch don't retroactively update the merge commit

## What Prevented It From Being Caught Earlier

- The `gh pr edit` command updated the PR description but didn't warn that the PR was already merged
- No post-merge verification step to compare branch HEAD vs merge commit

## Prevention

- **Always verify after merge.** After a PR is merged, run `git log main --oneline -3` to confirm all expected commits are on main.
- **Don't push to merged branches.** If a PR is already merged, create a new branch and PR for additional changes.
- **Check PR state before pushing.** Run `gh pr view <number> --json state` before pushing follow-up commits to a PR branch.
