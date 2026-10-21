---
instruction_id: trust-a-pre-verified-finding-as-filed
title: Trust a pre-verified finding as filed
summary: A finding from a lane whose evidence rules already made it read the tests and run the searches it cites is taken as filed; the finding has to stand on its own evidence.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A finding comes from a lane that already verified it against the code and the tests.
conditions_does_not_apply_when: The finding was not verified by the lane that produced it.
artifact_contract_output_type: pre-verified-finding
artifact_contract_required_data:
  - the finding as filed
  - the verdict rendered from the filed evidence
  - the disposition it carries
artifact_contract_verified_by: the verdict was rendered from the filed evidence without a second verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 2
---

# Trust a pre-verified finding as filed
A gap finding from the verification-gap lens arrives pre-verified — that lens's evidence rules made it read the tests and run the searches it cites, and triage trusts the claim as filed.
Skip verification, render the verdict from the filed evidence, and weigh its filed disposition when routing.
Its `Other findings` are verified like everything else.
Triage trusts a gap finding as filed and does not re-verify it, so each block must stand on its own evidence.
