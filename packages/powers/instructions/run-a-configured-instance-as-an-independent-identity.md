---
instruction_id: run-a-configured-instance-as-an-independent-identity
title: Run a configured instance as an independent identity
summary: "A configured reviewer instance runs as an identity of its own and resolves through a lane rather than being a lane itself, with its own model and agent."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A reviewer set names instances instead of plain reviewers.
conditions_does_not_apply_when: No instance is configured.
artifact_contract_output_type: reviewer-instances
artifact_contract_required_data:
  - the instances
  - the lane each resolves through
  - the model each used
artifact_contract_verified_by: each instance ran with its own model through its lane
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review/steps/reviewer-instances-note-1.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review/steps/reviewer-instances-note-2.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Run a configured instance as an independent identity
run as independent identities
instances resolve *through* a lane and are not lanes themselves
Each selected instance invokes its base `cli` with its own `model`
