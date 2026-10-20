---
instruction_id: anchor-the-vocabulary-in-the-glossary
title: Anchor the vocabulary in the glossary
summary: "Define every domain noun once in the glossary, use the terms verbatim everywhere else, and add a new noun in the same pass it appears."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: A requirements document has domain nouns in it.
conditions_does_not_apply_when: The document has no shared vocabulary to anchor.
artifact_contract_output_type: glossary-usage
artifact_contract_required_data:
  - the glossary terms
  - the synonyms that were refused
artifact_contract_verified_by: no synonym appears outside the glossary and every new noun was added in the pass it appeared
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
status: active
revision: 1
---

# Anchor the vocabulary in the glossary
Downstream workflows and readers must use these terms exactly.
FRs, UJs, and SMs use Glossary terms verbatim; introducing a synonym anywhere in the PRD is a discipline violation.
If §4 introduces a new domain noun, add it to the Glossary in the same pass.
Every domain noun the rest of the document uses. Defined once. No synonyms anywhere else in the PRD.
