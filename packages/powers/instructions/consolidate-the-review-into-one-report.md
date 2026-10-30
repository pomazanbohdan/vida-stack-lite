---
instruction_id: consolidate-the-review-into-one-report
title: Consolidate the review into one report
summary: "After every reviewer returns, render one consolidated report: no overall grade, one section per rubric category, one per extra reviewer, and the findings grouped by severity in a markdown twin."
capability_tags:
  - review-code
pattern_tags:
  - output-formatting
conditions_applies_when: Several review lenses have returned.
conditions_does_not_apply_when: One lens returned and no synthesis is wanted.
artifact_contract_output_type: validation-report
artifact_contract_required_data:
  - the overall verdict
  - the category verdicts
  - the findings by severity
  - the reviewer files
artifact_contract_verified_by: "the report has no overall grade, one section per category and the findings grouped by severity"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/validate.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/headless.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Consolidate the review into one report
Under Validate intent, after every reviewer returns, render one consolidated report. Don't skip.
No overall grade — the per-category verdicts and severity counts already say what's true.
Synthesis paragraph lifts the rubric's overall verdict; add a second if extra reviewers shift the picture.
One section per rubric category (open if thin / broken), one per extra reviewer (closed, adversarial voice preserved).
Always write both `validation-report.html` and `validation-report.md` regardless of finding count.
Always include `"offer_to_update": true`.
Re-running overwrites the consolidated report; individual `review-*.md` files persist.
Surface artifact paths. Always offer to roll findings into an Update.
## The report
Overall verdict
{synthesis paragraphs}
Category verdicts
- Flow coverage — {verdict}
- Token completeness — {verdict}
- Component coverage — {verdict}
- State coverage — {verdict}
- Visual reference coverage — {verdict}
- Bloat & overspecification — {verdict}
- Inheritance discipline — {verdict}
- Shape fit — {verdict}
## Findings by severity
### Critical (n)
**[Category or Reviewer]** — Title (§ location)
Fix: {suggested fix}
### Important (n) / Minor (n)
