---
instruction_id: offer-real-choices-not-a-let-the-agent-decide-cop-out
title: "Offer real choices, not a \"let the agent decide\" cop-out"
summary: "A decision prompt offers the real choices; it never offers to decide for the user, and a free-text escape is allowed instead."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A prompt asks the user to choose between options.
conditions_does_not_apply_when: The prompt asks a question that has no alternatives.
artifact_contract_output_type: choice-prompt
artifact_contract_required_data:
  - the real options
  - the escape offered
  - what the prompt refuses to offer
artifact_contract_verified_by: no option delegates the decision back to the agent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/gate-prompts.md
status: active
revision: 1
---

# Offer real choices, not a "let the agent decide" cop-out
Present real choices only — do NOT include a "skip" or "you decide" option (the user ran discuss-phase to decide).
An "Other" free-text escape hatch may be offered
but never a "Let the agent decide" cop-out.
