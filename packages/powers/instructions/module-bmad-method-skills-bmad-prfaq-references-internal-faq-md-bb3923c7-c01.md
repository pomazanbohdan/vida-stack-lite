---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prfaq-references-internal-faq-md-bb3923c7-c01"
title: "bmad-method: skills/bmad-prfaq/references/internal-faq.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-prfaq/references/internal-faq.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prfaq/references/internal-faq.md\"}"
atom_ids:
  - ask-the-stakeholders-the-founder-avoids
  - reject-unexamined-unknowns
atom_count: 2
atoms: "[{\"atom_id\":\"ask-the-stakeholders-the-founder-avoids\",\"file_sha256\":\"2ac56fce7f0cbc1c67c78d7c1bf891b99856d2da032fe5ee53564cf994d3e197\",\"content_sha256\":\"41773a6296c3021c949f6afeecda2b2e861cf6b5bdb0b2a3aedc3f53b3d7f54a\",\"file_bytes\":2563,\"body_bytes\":1363},{\"atom_id\":\"reject-unexamined-unknowns\",\"file_sha256\":\"2252ac8e5ccf1441dbfa8dcfc021604dd502211f328f46d40b009da8e26faab1\",\"content_sha256\":\"e7d30ee54b09c6836ba280f74ae1a5d8b4e667bc564d7e2ce7cf3b4f8bf27a04\",\"file_bytes\":1741,\"body_bytes\":685}]"
carrier_sha256: a2c13b58741e8f29db771c217387f5458294539fb39a73c0071cc346cfee1277
carrier_bytes: 4549
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-the-stakeholders-the-founder-avoids -->
---
instruction_id: ask-the-stakeholders-the-founder-avoids
title: Ask the stakeholders the founder avoids
summary: "Become the internal panel — engineering, finance, legal, operations — and ask the feasibility, viability, resource, risk and strategy questions, including the one nobody wants to hear."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The concept is being tested from the builder side.
conditions_does_not_apply_when: Only the customer side is being tested.
artifact_contract_output_type: internal-question-set
artifact_contract_required_data:
  - the six to ten questions
  - the angle each question covers
  - the question the founder avoids
artifact_contract_verified_by: the question the founder avoids is in the set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/internal-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
  - business
  - operations
---

# Ask the stakeholders the founder avoids
Stress-test the concept from the builder's side. The customer FAQ asked "should I use this?" The internal FAQ asks "can we actually pull this off — and should we?"
You are now the internal stakeholder panel — engineering lead, finance, legal, operations, the CEO who's seen a hundred pitches. The press release was inspiring. Now prove it's real.
Generate 6-10 internal FAQ questions that cover these angles:
Feasibility: "What's the hardest technical problem here?" / "What do we not know how to build yet?" / "What are the key dependencies and risks?"
Business viability: "What does the unit economics look like?" / "How do we acquire the first 100 customers?" / "What's the competitive moat — and how durable is it?"
Resource reality: "What does the team need to look like?" / "What's the realistic timeline to a usable product?" / "What do we have to say no to in order to do this?"
Risk: "What kills this?" / "What's the worst-case scenario if we ship and it doesn't work?" / "What regulatory or legal exposure exists?"
Strategic fit: "Why us? Why now?" / "What does this cannibalize?" / "If this succeeds, what does the company look like in 3 years?"
The question the founder avoids: The internal counterpart to the hard customer question. The thing that keeps them up at night but hasn't been said out loud.
<!-- vpmodule:atom:end ask-the-stakeholders-the-founder-avoids -->
<!-- vpmodule:atom:begin reject-unexamined-unknowns -->
---
instruction_id: reject-unexamined-unknowns
title: Reject unexamined unknowns
summary: "\"We will figure it out\" is not an answer. An honest unknown is acceptable only with a plan for finding out and a date by which it is needed."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - requirements-clarification
conditions_applies_when: A stakeholder answer defers a hard question.
conditions_does_not_apply_when: The answer is a fact with a source.
artifact_contract_output_type: unknown-triage
artifact_contract_required_data:
  - the unknown
  - what would it take to find out
  - when it is needed by
artifact_contract_verified_by: every unknown carries a way to find out and a date
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/internal-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - business
---

# Reject unexamined unknowns
Work through answers. Demand specificity. "We'll figure it out" is not an answer. Neither is "we'll hire for that." What's the actual plan?
Honest unknowns are fine — unexamined unknowns are not. If the answer is "we don't know yet," the follow-up is: "What would it take to find out, and when do you need to know by?"
Watch for hand-waving on resources and timeline. These are the most commonly over-optimistic answers. Push for concrete scoping.
This stage is complete when the internal questions have honest, specific answers — and the user has a clear-eyed view of what it actually takes to execute this concept.
Optimism is fine. Delusion is not.
<!-- vpmodule:atom:end reject-unexamined-unknowns -->