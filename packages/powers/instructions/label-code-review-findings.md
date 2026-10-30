---
instruction_id: label-code-review-findings
title: Label every finding with a severity
summary: "Give every finding one of the canonical severities - Critical, Important or Minor - and let the label decide whether the change can be approved. The labels are the corpus scale, mapped from the donors own."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - finding-severity-policy
  - finding-shape-policy
conditions_applies_when: A review has produced findings that need a severity and a merge decision.
conditions_does_not_apply_when: The findings already carry a settled severity from an earlier review.
artifact_contract_output_type: labelled-findings
artifact_contract_required_data:
  - finding
  - severity label
  - fix recommendation for Critical and Important
artifact_contract_verified_by: no Critical finding is left without a fix recommendation and the approval follows the labels
compatibility_excludes:
  - report-the-review-in-one-canonical-finding-shape
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/code-reviewer.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/contexts/review.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
status: active
revision: 9
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Label every finding with a severity
Categorize every finding.

**Critical** — Blocks merge (security vulnerability, data loss risk, broken functionality)

**Important** — Must address before merge (missing test, wrong abstraction, poor error handling)

**Minor** — Worth considering but not required (a simpler design, a useful refactor); minor and optional, the author may ignore (formatting, naming, style preferences)

Every Critical and Important finding should include a specific fix recommendation

Don't approve code with Critical issues

`Critical` (intolerable), `Important` (tolerable), `Minor` (cosmetic or negligible) — the bad outcome is real. Assign severity by how much it hurts end users or developers. For developer-only problems (inconsistent design, eroded invariants, duplicated sources of truth), name where it will cause trouble — which caller will diverge, which rule will break. A vague "this is messy" with no named harm is not a severity grade; use `false` or `maybe-false` instead. When the harm is real but you cannot tell how bad, pick the higher grade.

`false` — you checked, and the bad outcome does not happen at the cited location. Write what disproves this specific claim. A true fact about nearby code that does not disprove the claim does not count.

`maybe-false` — you could not tell whether the bad outcome happens. Write what you would need to check to find out. Use this only when the diff and surrounding code leave the question open; when they are enough to decide, pick `Critical`, `Important`, `Minor`, or `false`.
The severity of a finding is Critical, Important or Minor.
Critical is intolerable, Important is tolerable, Minor is cosmetic or negligible — in all three the bad outcome is real.
Assign severity by how much it hurts end users or developers.
For developer-only problems (inconsistent design, eroded invariants, duplicated sources of truth), name where it will cause trouble — which caller will diverge, which rule will break.
A vague "this is messy" with no named harm is not a severity grade; use `false` or `maybe-false` instead.
When the harm is real but you cannot tell how bad, pick the higher grade.
Reject Minor findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly — no proof needed) and the fix is more than a direct correction or deletion — adding guards, branches, parameters, or other complexity.
- Organize findings by severity: Critical, Important, Minor.
- A plan that fails any Critical-severity check is returned to the `gsd-planner` for revision (up to 3 iterations).
- **7b — Scope Reduction Detection** | Task actions do not silently reduce a locked decision to a "v1", "stub", or "future enhancement" without delivering the full decision scope. Always Critical when found.
