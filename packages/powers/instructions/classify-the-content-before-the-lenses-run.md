---
instruction_id: classify-the-content-before-the-lenses-run
title: Classify the content before the lenses run
summary: "The content is classified as a diff, a source file, a function or a document, and as code or docs, because the scope rules and the lens applicability both depend on it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The content to review has been loaded and the lenses have not started yet.
conditions_does_not_apply_when: The content class was already stated by the caller.
artifact_contract_output_type: content-class
artifact_contract_required_data:
  - the content form
  - whether it is code or docs
  - the lenses that apply to that class
artifact_contract_verified_by: the class is named before the lenses run and the applicable lenses follow from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 1
---

# Classify the content before the lenses run
Classify the content — diff, source file, function, or document — and whether it is code or docs; scope rules and lens applicability both depend on it.
A document that defines behavior (spec, requirements, plan, story) is docs that a behavioral lens may still apply to; judge by `when`.
