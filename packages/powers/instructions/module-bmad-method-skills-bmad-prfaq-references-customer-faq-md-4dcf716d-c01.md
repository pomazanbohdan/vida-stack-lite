---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prfaq-references-customer-faq-md-4dcf716d-c01"
title: "bmad-method: skills/bmad-prfaq/references/customer-faq.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-prfaq/references/customer-faq.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prfaq/references/customer-faq.md\"}"
atom_ids:
  - answer-the-faq-honestly-and-specifically
  - ask-the-questions-they-hope-nobody-asks
  - force-a-decision-on-every-gap-the-answers-reveal
atom_count: 3
atoms: "[{\"atom_id\":\"answer-the-faq-honestly-and-specifically\",\"file_sha256\":\"417ad49ecb6d3acdb7046763c2877339958909c1a4add55bbfb872e68e65ec3a\",\"content_sha256\":\"d4b89bbb9163fd8930d6f67bd8ba3b99d79235bde25cffd640b2451ded62e9de\",\"file_bytes\":1908,\"body_bytes\":733},{\"atom_id\":\"ask-the-questions-they-hope-nobody-asks\",\"file_sha256\":\"fe6b3d2a4ae40336d28ba4094fef9a67f3b2a2c64d24dc8537782c7d8379c9d2\",\"content_sha256\":\"53d3bb9a625e7ba4a132a5c7f4df65cad6498fa18dedcbaa1797ea167af9c486\",\"file_bytes\":2411,\"body_bytes\":1222},{\"atom_id\":\"force-a-decision-on-every-gap-the-answers-reveal\",\"file_sha256\":\"5869c0050a8d1423832d75adffedc8f2f7777ba4ca8ea10c6744c51a7dcdcb9b\",\"content_sha256\":\"a87a30c3da855309a8ac236169b57b526926a53c8d7082ebb6c9fc599e3d0aaa\",\"file_bytes\":1305,\"body_bytes\":205}]"
carrier_sha256: 4e4838e57c919f53f273904c8271700d691d361c9f93f283de264a4c04e660e7
carrier_bytes: 6051
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-the-faq-honestly-and-specifically -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/customer-faq.md
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
<!-- vpmodule:atom:end answer-the-faq-honestly-and-specifically -->
<!-- vpmodule:atom:begin ask-the-questions-they-hope-nobody-asks -->
---
instruction_id: ask-the-questions-they-hope-nobody-asks
title: Ask the questions they hope nobody asks
summary: "Become the busy, skeptical customer and generate the objections that stand between interest and adoption, including the one question the team hopes nobody asks."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The value proposition of a concept is being tested from the outside.
conditions_does_not_apply_when: The questions are known and only the answers are missing.
artifact_contract_output_type: customer-question-set
artifact_contract_required_data:
  - the six to ten questions
  - the angle each question covers
  - the hardest question
artifact_contract_verified_by: no softball question survived and the hardest question is in the set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/customer-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Ask the questions they hope nobody asks
Validate the value proposition by asking the hardest questions a real user would ask — and crafting answers that hold up under scrutiny.
You are now the customer. Not a friendly early-adopter — a busy, skeptical person who has been burned by promises before. You've read the press release. Now you have questions.
Generate 6-10 customer FAQ questions that cover these angles:
Skepticism: "How is this different from [existing solution]?" / "Why should I switch from what I use today?"
Trust: "What happens to my data?" / "What if this shuts down?" / "Who's behind this?"
Practical concerns: "How much does it cost?" / "How long does it take to get started?" / "Does it work with [thing I already use]?"
Edge cases: "What if I need to [uncommon but real scenario]?" / "Does it work for [adjacent use case]?"
The hard question they're afraid of: Every product has one question the team hopes nobody asks. Find it and ask it.
Don't generate softball questions. "How do I sign up?" is not a FAQ — it's a CTA. Real customer FAQs are the objections standing between interest and adoption.
Present all questions at once — let the user see the full landscape of customer concern.
<!-- vpmodule:atom:end ask-the-questions-they-hope-nobody-asks -->
<!-- vpmodule:atom:begin force-a-decision-on-every-gap-the-answers-reveal -->
---
instruction_id: force-a-decision-on-every-gap-the-answers-reveal
title: Force a decision on every gap the answers reveal
summary: "When an answer exposes a real gap in the concept, name the gap and force the decision: launch blocker, fast-follow, or accepted trade-off."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - report-triage
conditions_applies_when: An answer revealed a real gap in the concept.
conditions_does_not_apply_when: The answer revealed no gap.
artifact_contract_output_type: gap-decision
artifact_contract_required_data:
  - the gap
  - the class of the decision
  - the decision
artifact_contract_verified_by: "the gap is named and classified as a launch blocker, a fast-follow, or an accepted trade-off"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/customer-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Force a decision on every gap the answers reveal
If an answer reveals a real gap in the concept, name it directly and force a decision: is this a launch blocker, a fast-follow, or an accepted trade-off?
<!-- vpmodule:atom:end force-a-decision-on-every-gap-the-answers-reveal -->