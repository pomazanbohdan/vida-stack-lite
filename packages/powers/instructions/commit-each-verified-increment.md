---
instruction_id: commit-each-verified-increment
title: Commit each verified increment
summary: "Commit every increment that passes its checks, so a failure costs one increment instead of the whole piece of work."
capability_tags:
  - integrate-branch
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verified increment of work is ready to be recorded.
conditions_does_not_apply_when: The increment does not pass its checks yet.
artifact_contract_output_type: commit-rhythm
artifact_contract_required_data:
  - the increment
  - the check it passed
  - the commit
artifact_contract_verified_by: each commit follows a green check and no uncommitted work piles up
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 1
---

# Commit each verified increment

Each successful increment gets its own commit. Don't accumulate large uncommitted changes.

```
Work pattern:
  Implement slice → Test → Verify → Commit → Next slice

Not this:
  Implement everything → Hope it works → Giant commit
```

Commits are save points. If the next change breaks something, you can revert to the last known-good state instantly.

```
Agent starts work
    │
    ├── Makes a change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → All commits form a clean history
```

This pattern means you never lose more than one increment of work. If an agent goes off the rails, `git reset --hard HEAD` takes you back to the last successful state.

"I'll commit when the feature is done" | One giant commit is impossible to review, debug, or revert. Commit each slice.

Large uncommitted changes accumulating.
