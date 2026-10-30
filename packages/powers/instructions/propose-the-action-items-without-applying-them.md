---
instruction_id: propose-the-action-items-without-applying-them
title: Propose the action items without applying them
summary: "The action items are written up with an owner and proposed, not applied: the fixes go back into the normal work loop and the person applies the spec reconciliation."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - code-audit
conditions_applies_when: The fix-now findings and the process lessons are turned into action items.
conditions_does_not_apply_when: The action items were already written and approved.
artifact_contract_output_type: action-items
artifact_contract_required_data:
  - what to change
  - the owner
  - the kind of action item
artifact_contract_verified_by: "every action item names a change and an owner, and nothing was applied by the run"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/acceptance-verdict.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/mvp-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/complexity-triggered-refactor.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Propose the action items without applying them
Compile fix-now findings and process lessons into specific, owned action items. Each names what to change and who owns it.
Two kinds are *proposed, not applied* in this version:
- **Remediation** — code fixes are written up as action items (or story-shaped work) for the normal dev loop to execute later. The retrospective does not run the dev loop itself.
- **Spec reconciliation** — where the as-built diverges from the spec, propose the reconciliation as an action item with the evidence attached. The human applies it to the project contract; an uncertain interpretation is never written into the spec automatically.

When a split leaves further units, list them as the exact commands the user can run afterwards; do not create them - the user keeps control of the numbering.
Advisory by default: the proposal is informational only, never edits code, and never blocks.
The anchor is set the first time a function is observed and moves only when the proposal is dispositioned via `refactor accept` or `refactor decline` — never when the score alone improves
naming the exact remediation, so this enforcement gap is never silent.
