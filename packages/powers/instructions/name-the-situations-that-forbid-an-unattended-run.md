---
instruction_id: name-the-situations-that-forbid-an-unattended-run
title: Name the situations that forbid an unattended run
summary: "Unsettled decisions, novel or high-risk work, and a half-finished phase are the reasons to stay in the loop."
capability_tags:
  - coordinate-program
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A choice is being made between an unattended run and a supervised one.
conditions_does_not_apply_when: The run is already supervised.
artifact_contract_output_type: run-suitability-decision
artifact_contract_required_data:
  - the situation
  - the reason an unattended run is refused
artifact_contract_verified_by: the refusal names the situation that makes an unattended run unsafe
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/run-phases-autonomously.md
status: active
revision: 1
---

# Name the situations that forbid an unattended run
**Phases have unsettled design decisions.**
Run discuss interactively first, or use `--interactive`.
**The phase has novel or high-risk work.** Autonomous mode skips pauses unless it hits a blocker. On a phase where you expect surprises, stay in the loop with manual execution.
**You are mid-phase with partial execution.** Autonomous mode picks up incomplete phases but it does not resume a partially-executed wave.
