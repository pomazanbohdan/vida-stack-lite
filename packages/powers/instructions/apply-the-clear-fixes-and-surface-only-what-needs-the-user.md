---
instruction_id: apply-the-clear-fixes-and-surface-only-what-needs-the-user
title: Apply the clear fixes and surface only what needs the user
summary: "At your own gate, apply the clear fixes — and never dismiss what you cannot judge — and put only the rest in front of the user; under a validation run, report instead of changing."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A gate of independent lenses has produced findings about a finished artefact.
conditions_does_not_apply_when: The findings have not been gathered yet.
artifact_contract_output_type: gate-disposition
artifact_contract_required_data:
  - the clear fixes applied
  - the findings that need the user
  - the report
artifact_contract_verified_by: the clear fixes are applied and only the judgment calls reach the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/references/reviewer-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Apply the clear fixes and surface only what needs the user
This is your own gate — apply the clear fixes rather than handing over a list; surface only what genuinely needs the user.
Under a validation run,
fold every reviewer's output into one bespoke HTML + markdown report and open the HTML.
never auto-dismiss — a wrong dismissal is the exact silent failure being eliminated
it NEVER auto-`dismiss`es and never auto-resolves an unclassified item with backstop
The reason string is the audit trail; silence is not a valid dismissal.
A missing shape is not evidence an edge exists, so minting a held-out edge obligation on a requirement that may be genuinely edge-free would be a false claim and risks a vacuous edge test.
