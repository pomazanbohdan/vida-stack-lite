---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-core
title: "Write for the reader's task"
summary: "Write for the reader's task rather than the feature list; treat the guide as guidelines, keep a project style guide first, and apply [EN] rules only to English without translating unless asked."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-type-fit
conditions_applies_when: All documentation work.
conditions_does_not_apply_when: A document with no reader task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The document names its reader task, precedence and language layer."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L14-L22"
status: active
revision: 1
---

# Write for the reader's task

Write for the reader's task, not the product's feature list; prose should be conversational but not frivolous, precise, and consistent. The guide's rules are guidelines, not absolute rules: depart from them when doing so improves the content (established domain terminology wins) but stay consistent within the document. Precedence: a project's own style guide first, then Google's Developer Documentation Style Guide, then Merriam-Webster (spelling), the Chicago Manual of Style (general style), and the Microsoft Writing Style Guide (technical style). Rules come in two layers: structural and content rules (headings, procedures, code samples, second person, active voice, timeless docs, accessibility) apply to documentation in any language; rules tagged [EN] (spelling, serial comma, contractions, the word list) apply only to English text and must be skipped for other languages. Never translate a document unless asked.
