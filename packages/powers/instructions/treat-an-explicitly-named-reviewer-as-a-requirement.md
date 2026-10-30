---
instruction_id: treat-an-explicitly-named-reviewer-as-a-requirement
title: Treat an explicitly named reviewer as a requirement
summary: "A reviewer the owner named on the command line is an assertion, not a preference: if it cannot run that is an error that is surfaced, while a configured default set is a preference across hosts and only fails when none of it can run."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A set of reviewers is selected, some of them named by the owner."
conditions_does_not_apply_when: The reviewers are chosen by the run itself and nobody named one.
artifact_contract_output_type: reviewer-selection
artifact_contract_required_data:
  - the named reviewers
  - the one that could not run
  - the error that was raised
artifact_contract_verified_by: a named reviewer that could not run produced an error instead of a thinner set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Treat an explicitly named reviewer as a requirement
A lane the user named on the command line and that cannot run is an **error**, surfaced and non-silent
even when other named lanes did run
Do not proceed with a thinner reviewer set and report success
not finding a lane nobody asked for is normal; failing to run a lane somebody asked for is an error
a configured default is a preference evaluated across many hosts, so a subset being present is expected, not an error
If all configured reviewers are unavailable, fail with an actionable message
