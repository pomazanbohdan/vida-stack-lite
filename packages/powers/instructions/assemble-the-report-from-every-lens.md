---
instruction_id: assemble-the-report-from-every-lens
title: Assemble the report from every lens
summary: "Every lens’s findings are kept, an overlap between two lenses is signal and not duplication, and a lens that found nothing gets one line."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - output-formatting
conditions_applies_when: The lenses have reported and the findings are assembled.
conditions_does_not_apply_when: Only one lens ran and its output is already the report.
artifact_contract_output_type: lens-report
artifact_contract_required_data:
  - the findings of every lens
  - the lens each finding came from
  - the overlaps between lenses
  - the lenses that found nothing
artifact_contract_verified_by: "no lens finding was dropped or deduplicated away, and a clean review is stated plainly"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Assemble the report from every lens
Keep every lens's findings — overlap between lenses is signal, not duplication; note it in the markdown report rather than deduping.
The markdown report groups findings by lens, each rendered in its declared shape: a short block per finding rendering the fields plus any extras worth surfacing, one line for a lens that found nothing, and a plain clean statement when the whole review is clean.
