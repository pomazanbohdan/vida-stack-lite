---
instruction_id: harvest-shortcut-debt-ledger
title: Harvest deferred simplifications into one debt ledger
summary: Find the shortcut markers in comments and collect them into one ledger with the ceiling and the upgrade trigger.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: You need to see which simplifications were deferred and whether each has an upgrade trigger.
conditions_does_not_apply_when: Nothing in the repository is marked as a deferred shortcut.
artifact_contract_output_type: shortcut-debt-ledger
artifact_contract_required_data:
  - file and line
  - what was simplified
  - ceiling
  - upgrade trigger
  - count with no trigger
artifact_contract_verified_by: every marker appears once with its ceiling and upgrade trigger
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-debt.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
status: active
revision: 2
---

# Harvest deferred simplifications into one debt ledger
Every deliberate shortcut is marked with a `shortcut:` comment naming its ceiling and upgrade path.
This collects them into one ledger so a deferral can't quietly become permanent.
Search the repo for comment markers, skipping `.git` and everything the `.gitignore` files ignore: dependencies, build output, caches, in any stack.
If the user names their own marker word, search for that word instead.
Each hit is one ledger row.
The comment prefix keeps prose that merely mentions the convention out of the ledger.
Skip hits that are not a deferral, like a note about a keyboard shortcut.
One row per marker, grouped by file.
A row carries the location, what was simplified, the ceiling named, and the upgrade trigger.
Flag the rot risk: any marker comment that names no upgrade path or trigger gets a `no-trigger` tag.
Those are the ones that silently rot.
End with the count of markers and how many have no trigger.
Nothing found: no shortcut debt, clean ledger.
Reads and reports only, changes nothing.
To persist it, ask and it writes the ledger to a file.
