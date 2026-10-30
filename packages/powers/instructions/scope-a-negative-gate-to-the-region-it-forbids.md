---
instruction_id: scope-a-negative-gate-to-the-region-it-forbids
title: Scope a negative gate to the region it forbids
summary: "A file-wide negative grep cannot say absent in one function and present in another; the gate is scoped to the region, and only an intentional split falls back to a named suppression."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Two tasks in the same phase need opposite treatment of the same construct in the same file.
conditions_does_not_apply_when: The construct is absent from the whole file.
artifact_contract_output_type: scoped-gate
artifact_contract_required_data:
  - the region the gate is scoped to
  - the check that replaces the file-wide grep
  - the marker when the split is intentional
artifact_contract_verified_by: the gate passes for the region it forbids and the sibling region keeps the construct it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope a negative gate to the region it forbids
A **negative grep** - `! grep -Eq 'PAT' file` or `grep -c 'PAT' file == 0` - asserts a construct is absent. `grep` is file-scoped by nature: it has no notion of function or region. This breaks down when a phase splits one file across parallel tasks with legitimately opposite needs for the same construct in different regions:
Both occurrences are real, correct production code in different functions of one file. A file-wide negative grep cannot say "absent in function X, present in function Y", so the two gates are mutually unsatisfiable with a direct call - the executor is pushed into an indirection whose only purpose is to relocate the matched string out of the file (pure gate-appeasement, zero behaviour change).
**The fix:** region-scope the negative gate so "absent in region X" stops implying "absent file-wide."
Both gates pass with no code restructuring. Prefer an AST/structural check or a focused unit test where region extraction is fragile.
If region-scoping is genuinely impractical and the file split is intentional, suppress the warning with a marker naming the pattern
One marker per pattern. The marker exempts only the exact pattern it names. Prefer region-scoping over suppression.
