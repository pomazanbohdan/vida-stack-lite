---
instruction_id: tell-nothing-to-report-apart-from-could-not-look
title: Tell nothing to report apart from could not look
summary: "A verdict that found nothing and a verdict that examined nothing are different outcomes, and only one of them is good news."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check reports a negative result and the reason for it is not stated.
conditions_does_not_apply_when: The check ran and examined real input.
artifact_contract_output_type: check-outcome
artifact_contract_required_data:
  - the outcome
  - the distinction between an empty result and an unexamined input
artifact_contract_verified_by: the outcome states whether real input was examined
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-a-skipped-capability-probe.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell nothing to report apart from could not look
A verdict of `detected: false` or `passed: true` means the detector examined real text and found nothing.
A `skipped` payload or a `scope_unavailable` block means the detector examined nothing at all.
Only the first is good news; the second is a request for more scope, not a clean bill of health.
Tell "nothing to report" apart from "could not look" — they are different outcomes and only one of them is good news.
