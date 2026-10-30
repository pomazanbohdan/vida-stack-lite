---
instruction_id: an-unrecognised-result-is-not-a-completion
title: An unrecognised result is not a completion
summary: "Every return value falls into exactly one class, and a result that is not recognised is treated as not finished rather than as done."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: A delegated step returns a result that does not match a known class.
conditions_does_not_apply_when: The result is one of the known classes.
artifact_contract_output_type: return-classification
artifact_contract_required_data:
  - the class of the return
  - the action each class triggers
artifact_contract_verified_by: an unrecognised result was not read as complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# An unrecognised result is not a completion
Every return from the session manager falls into exactly one of three buckets.
Do not treat "not recognized" as "complete."
Terminal - complete.
Terminal - abandoned.
Non-terminal - auto-resume.
