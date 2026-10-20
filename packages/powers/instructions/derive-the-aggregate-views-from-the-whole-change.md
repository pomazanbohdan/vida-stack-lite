---
instruction_id: derive-the-aggregate-views-from-the-whole-change
title: Derive the aggregate views from the whole change
summary: "The views of the whole change find the defects that no single session and no single diff hunk could see, and a view is measured by a script rather than by an impression."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work that spans several sessions is read back.
conditions_does_not_apply_when: The change is small enough that a single session saw all of it.
artifact_contract_output_type: aggregate-views
artifact_contract_required_data:
  - the views that were derived
  - the evidence each view rests on
  - the views that were narrowed
artifact_contract_verified_by: "every view that became a finding carries a source reference, and a view computed by hand records its narrowed scope"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 1
---

# Derive the aggregate views from the whole change
An epic is many coding sessions, each validated in isolation; the defects that matter are the ones no single session — and no single diff hunk — could see.
Prefer deterministic derivation: a script that measures the codebase is evidence; a model's impression is not.
Where you compute a view inline instead of by script, record the narrowed scope.
Every observation that becomes a finding carries a source reference — the file, the symbol, the commits.
