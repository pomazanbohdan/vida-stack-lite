---
instruction_id: make-a-new-exemption-a-visible-diff
title: Make a new exemption a visible diff
summary: "A new exemption is refused unless it is already in the pinned baseline, so adding one is always a reviewable change; a baseline entry that has gone stale is pruned in the same change."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: "A new exemption from a check is about to be added, or a pinned exemption no longer applies."
conditions_does_not_apply_when: The exemption is already in the pinned baseline.
artifact_contract_output_type: exemption-ratchet
artifact_contract_required_data:
  - the exemption marker
  - the pinned baseline it must already be in
  - the stale entries that are pruned
artifact_contract_verified_by: "a new exemption is a visible, reviewable change and the stale entries are pruned with it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/docs-guard-registration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make a new exemption a visible diff
- A brand-new `// docs-guard-exempt:` marker that is not already in the baseline fails the lint, so adding one is always a visible, reviewable diff — not a silent opt-out a test author can add without anyone noticing.
- A baseline entry whose file no longer exists, or no longer carries the marker, is reported stale and must be pruned in the same PR that removes it.
