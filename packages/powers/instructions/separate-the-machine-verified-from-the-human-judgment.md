---
instruction_id: separate-the-machine-verified-from-the-human-judgment
title: Separate the machine-verified from the human judgment
summary: What a machine can decide is decided by the machine; what needs taste is flagged for the person and shown separately after the machine pass is done.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An audit mixes mechanical checks with questions of taste.
conditions_does_not_apply_when: Every finding is mechanical.
artifact_contract_output_type: review-findings
artifact_contract_required_data:
  - the mechanical findings
  - the findings that need human review
artifact_contract_verified_by: the human-judgment findings are marked and surfaced separately from the automated pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-review.md
status: active
revision: 1
---

# Separate the machine-verified from the human judgment
Flag items that require human judgment (brand feel, content tone) as `needs_human_review: true` in the findings — these are surfaced to the user separately after the automated pass completes.
If Playwright-MCP is not available in this session, this section is skipped entirely. The audit falls back to the standard code-only review described above.
No configuration change is required — the availability of `mcp__playwright__*` tools is detected at runtime.
