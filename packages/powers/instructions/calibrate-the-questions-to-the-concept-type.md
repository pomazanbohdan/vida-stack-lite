---
instruction_id: calibrate-the-questions-to-the-concept-type
title: Calibrate the questions to the concept type and the context
summary: "Detect whether the concept is a commercial product, an internal tool, an open-source project or a community initiative and frame the questions for that kind of thing; the structure stays, the language shifts."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The questions to ask depend on what kind of thing is being built and who is building it.
conditions_does_not_apply_when: The concept type and the context are already fixed and known.
artifact_contract_output_type: calibrated-question-set
artifact_contract_required_data:
  - the detected concept type
  - the substituted framing
artifact_contract_verified_by: no question asks for unit economics of a non-commercial project or for board alignment of a weekend project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/press-release.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/customer-faq.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/internal-faq.md
status: active
revision: 1
---

# Calibrate the questions to the concept type and the context
Concept type detection: Early in the conversation, identify whether this is a commercial product, internal tool, open-source project, or community/nonprofit initiative.
Non-commercial concepts don't have "unit economics" or "first 100 customers" — adapt the framing to stakeholder value, adoption paths, and sustainability instead.
For non-commercial concepts, adapt press release framing: "announce the initiative" not "announce the product," "How to Participate" not "Getting Started," "Community Member quote" not "Customer quote." The structure stays — the language shifts to match the audience.
Calibrate to concept type. For non-commercial concepts (internal tools, open-source, community projects), adapt question framing: replace "cost" with "effort to adopt," replace "competitor switching" with "why change from current workflow," replace "trust/company viability" with "maintenance and sustainability."
Calibrate questions to context. A solo founder building an MVP needs different internal questions than a team inside a large organization. Don't ask about "board alignment" for a weekend project. Don't ask about "weekend viability" for an enterprise product.
