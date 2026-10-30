---
instruction_id: run-a-pre-mortem-on-the-idea
title: Run a pre-mortem on the idea
summary: "Imagine the idea already failed and work backwards to the failure modes, and to which of them you are willing to accept."
capability_tags:
  - design-experiments
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A direction feels good but has not been pressure-tested.
conditions_does_not_apply_when: The direction was already pressure-tested against its failure modes.
artifact_contract_output_type: pre-mortem
artifact_contract_required_data:
  - the plausible reasons for failure
  - "for each: whether it is preventable"
  - the failure modes you are willing to accept
artifact_contract_verified_by: every failure mode is either accepted by name or marked as a signal to change the idea
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/frameworks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Run a pre-mortem on the idea

Imagine the idea has already failed. Work backwards:

1. It's 12 months from now. The project shipped and flopped. What went wrong?
2. List every plausible reason for failure — technical, market, team, timing
3. For each failure mode: Is this preventable? Is this a signal the idea needs to change?
4. Which failure modes are you willing to accept? Which ones would kill the project?
