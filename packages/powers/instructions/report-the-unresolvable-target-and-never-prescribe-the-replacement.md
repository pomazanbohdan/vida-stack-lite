---
instruction_id: report-the-unresolvable-target-and-never-prescribe-the-replacement
title: Report the unresolvable target and never prescribe the replacement
summary: The finding names the target that did not resolve and what was missing; choosing the replacement belongs to the planner.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A path probe reports a target that did not resolve.
conditions_does_not_apply_when: The probe grounded the path.
artifact_contract_output_type: path-finding
artifact_contract_required_data:
  - the target that failed
  - what was missing
artifact_contract_verified_by: the target is quoted and no replacement is proposed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verify-command-path-resolvability.md
status: active
revision: 1
---

# Report the unresolvable target and never prescribe the replacement
Do not hand-reason the filesystem
Consume the deterministic probe result, never re-derive it yourself
State the target that failed to resolve and what was missing. Choosing the replacement is the planner's job
`status: pending_creation` means an earlier task in this phase creates that directory. **Not a finding.** Say nothing
`unresolvable` means the probe could not ground the path (a variable, glob, substitution, or `~`)
never a licence to guess the literal path
