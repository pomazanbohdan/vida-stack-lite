---
instruction_id: match-the-anchored-pattern-to-the-real-output-shape
title: Match the anchored pattern to the real output shape
summary: "An anchored pattern is checked against the shape the tool really prints, because a line prefix turns an anchor into a pattern that matches nothing and the command silently succeeds."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check greps the output of a tool that prints a prefix before each line.
conditions_does_not_apply_when: The tool prints one bare line per record.
artifact_contract_output_type: pattern-check
artifact_contract_required_data:
  - the anchored pattern
  - the shape the output really has
artifact_contract_verified_by: the pattern was matched against the real output shape and matches what the tool prints
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Match the anchored pattern to the real output shape
`pnpm ls vite | grep -E '^vite@7\.'` looks correct but silently fails. `pnpm ls` uses tree characters as line prefixes:
The `^` anchor matches line start, which is a tree character - the grep finds nothing.
**Bad:** `pnpm ls vite | grep -E '^vite@7\.'`
**Good:** `pnpm ls vite | grep -E 'vite@7\.'`
Same trap: `npm ls`, `yarn list`, `docker ps` column output, `kubectl get` table output.
