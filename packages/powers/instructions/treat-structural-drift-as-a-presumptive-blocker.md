---
instruction_id: treat-structural-drift-as-a-presumptive-blocker
title: Treat structural drift as a presumptive blocker
summary: Surface a simpler design for named structural drifts and escalate them only when the change makes the structure worse.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review sees one of the named structural drifts in the change.
conditions_does_not_apply_when: The drift is outside the scope of the change and cannot be touched by it.
artifact_contract_output_type: presumptive-blocker-list
artifact_contract_required_data:
  - the drift
  - the simpler design proposed
  - the escalation decision and its grounds
artifact_contract_verified_by: each drift carries a proposed simpler design and is escalated only with a stated reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 1
---

# Treat structural drift as a presumptive blocker

**Presumptive blockers:** surface and propose the simpler design for each of these; escalate to Required only when the change actively makes structure worse:

- a refactor that relocates complexity instead of reducing it
- a change that pushes a file past the size boundary with no decomposition
- feature logic added to a shared module
- a near-duplicate of an existing canonical helper
- a silent fallback that hides an unclear invariant

**Is a new conditional bolted onto an unrelated flow?** That's a design smell, not a nit — push the logic into its own helper, state, or policy instead of tangling an existing path.

**Do repeated conditionals on the same shape appear?** They signal a missing model or dispatcher. A "temporary" branch is usually permanent debt.

New conditionals scattered into unrelated code paths (a missing abstraction)

A bespoke helper that duplicates an existing canonical one, or feature logic placed in a shared module
