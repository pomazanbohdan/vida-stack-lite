---
instruction_id: keep-the-empty-result-and-the-failed-check-apart
title: Keep the empty result and the failed check apart
summary: "A report states which of the two it is — there was nothing to check, or the check could not run and why — and the two are never collapsed into a single verdict."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check reports an outcome and the report can say that the check did not run.
conditions_does_not_apply_when: The check always runs and its verdict is the only possible outcome.
artifact_contract_output_type: outcome-report
artifact_contract_required_data:
  - the outcome
  - the reason code
  - what the outcome means
artifact_contract_verified_by: a report that could not look is never read as a report that found no issues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the empty result and the failed check apart
- The artifact separates **`nothing_to_report`** (there were no UI criteria) from **`could_not_look`** (there were criteria, and the check did not happen — with a reason code saying which). Collapsing those two is what produced the ambiguous run notes that opened the original report. A report claiming *no issues* when it never opened a browser is worse than no report.
