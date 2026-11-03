---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-diagnostic
title: Run the stickiness diagnostic
summary: "Ask the six diagnostic questions, identify weak traits and apply the matching fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a message.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: "The report scores each trait, fixes the lowest and rescores."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L224-L238"
status: active
revision: 1
---

# Run the stickiness diagnostic

Ask the six questions and apply the matching fix: Simple — can I state the core in one sentence? If not, find the Commander's Intent. Unexpected — would this surprise someone? If not, find the counterintuitive angle. Concrete — can I picture it happening? If not, add specific sensory details. Credible — why should someone believe this? If not, add proof, examples or the Sinatra Test. Emotional — does it make me feel something? If not, focus on one person rather than statistics. Stories — is there a story? If not, wrap the facts in a character, problem and resolution. Rescore after fixing the lowest trait.
