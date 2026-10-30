---
instruction_id: answer-the-faq-honestly-and-specifically
title: Answer the questions honestly and specifically
summary: "For every answer ask three things: is it honest, is it specific, would a customer believe it. Marketing language in an answer destroys the credibility of the whole document."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Questions are being answered for a customer audience.
conditions_does_not_apply_when: No question is being answered for a customer audience.
artifact_contract_output_type: answered-question-set
artifact_contract_required_data:
  - the question
  - the honest answer
  - the specifics behind it
artifact_contract_verified_by: "every question has an honest, specific answer and no marketing language"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/customer-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - business
---

# Answer the questions honestly and specifically
Work through answers together. The user drafts (or you draft and they react). For each answer:
Is it honest? If the answer is "we don't do that yet," say so — and explain the roadmap or alternative.
Is it specific? "We have enterprise-grade security" is not an answer. What certifications? What encryption? What SLA?
Would a customer believe it? Marketing language in FAQ answers destroys credibility.
The user can add their own questions too. Often they know the scary questions better than anyone.
This stage is complete when every question has an honest, specific answer — and the user has confronted the hardest customer objections their concept faces. No softballs survived.
