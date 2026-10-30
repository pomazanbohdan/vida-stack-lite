---
instruction_id: apply-the-response-language-to-the-narration-not-only-to-the-answer
title: "Apply the response language to the narration, not only to the answer"
summary: "A directive to answer in a language names the narration class, so the status updates, progress notes and findings are covered too; enumerating the members of the class is not enough."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A prompt or a template tells the model which language to answer in.
conditions_does_not_apply_when: The model produces no narration between its tool calls.
artifact_contract_output_type: language-directive
artifact_contract_required_data:
  - the language directive
  - the narration class it names
  - the narration it covers
artifact_contract_verified_by: the directive names the narration class and the narration follows the language
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/response-language-coverage.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Apply the response language to the narration, not only to the answer
- The user then reads a translated answer wrapped in English status updates, progress notes, and findings — which is the defect #2529 reports, not a stylistic preference.
- a directive counts only if it **names the narration class**.
- Enumerating members of the class — status updates, progress notes, findings — without naming the class does not satisfy it, because the enumeration reads as a closed list and the class is open
