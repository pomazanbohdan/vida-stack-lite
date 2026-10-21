---
instruction_id: paste-the-probe-output-not-a-summary
title: "Paste the probe output, not a summary"
summary: The output is what makes the claim checkable; a claim that a probe was run is as unfalsifiable as the absence it replaced.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A probe has been run and its result is recorded.
conditions_does_not_apply_when: No probe was run.
artifact_contract_output_type: probe-evidence
artifact_contract_required_data:
  - the raw output of the probe
artifact_contract_verified_by: the raw output sits beside the claim instead of a summary of it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/verify-a-dependency-compatibility-claim.md
status: active
revision: 1
---

# Paste the probe output, not a summary
Then paste the **output** — not a summary of it, and not an assertion that you ran it — beside the claim in RESEARCH.md.
The output is what makes the tag checkable; a claim that a probe was run is exactly as unfalsifiable as the absence it was meant to replace.
