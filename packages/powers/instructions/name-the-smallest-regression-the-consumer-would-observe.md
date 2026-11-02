---
instruction_id: name-the-smallest-regression-the-consumer-would-observe
title: Name the smallest regression the consumer would observe
summary: Every consumer is qualified by the smallest realistic regression it would show; 'this line could be removed without a test failing' is not a regression, and a consumer with no such regression is dropped.
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A changed behavior was traced to the places that observe it.
conditions_does_not_apply_when: No consumer of the changed behavior was found.
artifact_contract_output_type: consumer-qualification
artifact_contract_required_data:
  - the consumer
  - the smallest regression it would observe
  - the demonstration
artifact_contract_verified_by: every reported consumer has a concrete regression it would show
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the smallest regression the consumer would observe
For each consumer, name the smallest realistic regression this consumer would observe: invert the branch, drop the default, omit the field, return the old error code, skip the integration call, etc. This is the Demonstration; it describes what goes wrong for the consumer.
"This line could be removed without a test failing" is not a regression.
If there is no regression — the state is unreachable, the branch is defensive, or the code repeats what another line already guarantees — drop the path; there is no finding and nowhere else to file it.
Untested downstream code the change did not affect is not a finding.
