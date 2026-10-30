---
instruction_id: flag-the-theater-in-a-requirements-document
title: Flag the theater in a requirements document
summary: "Name the content that is there to look thorough — the personas, the novelty, the boilerplate requirements, the swappable vision — even when it is well written."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A requirements document is reviewed and its content may be furniture.
conditions_does_not_apply_when: The document is being written rather than reviewed.
artifact_contract_output_type: theater-findings
artifact_contract_required_data:
  - the kind of theater
  - the passage that shows it
  - the decision it fails to drive
artifact_contract_verified_by: each finding names the kind of theater and the passage that shows it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-validation-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Flag the theater in a requirements document
**Persona theater** — Personas that don't drive a single decision in the PRD. More than four personas. Personas whose only function is to make the PRD look thorough.
**Innovation theater** — claimed novelty that isn't novel. Differentiation sections written because the template had one, not because Discovery surfaced something.
**NFR theater** — copied boilerplate ("system must be scalable / secure / reliable") without product-specific thresholds.
**Vision theater** — a Vision statement that could swap into any PRD in this category without change.
Flag what reads like furniture, even if it's well-written furniture.
