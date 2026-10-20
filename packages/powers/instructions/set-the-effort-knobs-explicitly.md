---
instruction_id: set-the-effort-knobs-explicitly
title: Set the effort knobs explicitly
summary: "Rigor is bought with named knobs at the start, not accreted through extra passes; what the request says beats the preset."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A wide run is about to be started and its depth has to be chosen.
conditions_does_not_apply_when: The depth was already fixed by the requester.
artifact_contract_output_type: effort-knob-set
artifact_contract_required_data:
  - the preset
  - the knob values in force
  - where each value came from
artifact_contract_verified_by: "every knob has a stated value and a cap is treated as a cap, not a quota"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 1
---

# Set the effort knobs explicitly
**Fast by default.** Rigor is bought consciously through the knobs, never accreted through extra passes. One gate, light checkpoints, no ceremony.
Three knobs bundled in a **preset**; any knob pins individually, and **what the user says in the request beats both**.
**subagents** — parallel assistants: `none` (0 — inline, sequential; also the no-subagent-harness fallback), `low` (2), `normal` (3), `high` (6, cap 10 — beyond the 3–5 sweet spot only for genuinely wide work).
**max_sources_per_round** — distinct sources actually read per dimension per round (cap 25).
**max_depth** — rounds per dimension: initial pass plus lead-following follow-ups (cap 5). A cap, not a quota — dimensions stop early on coverage or novelty exhaustion.
