---
instruction_id: reuse-the-existing-research-without-prompting
title: Reuse the existing research without prompting
summary: When the research artifact already exists it is used as it is — the run neither asks nor re-does it.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The research artifact for the work already exists.
conditions_does_not_apply_when: A refresh was asked for explicitly.
artifact_contract_output_type: research-reuse
artifact_contract_required_data:
  - the artifact that was reused
  - the reason no prompt was shown
artifact_contract_verified_by: the existing research was used and the run neither prompted nor re-spawned it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/research-only-modifiers.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Reuse the existing research without prompting
auto-use the existing research and exit cleanly — do not prompt, do not re-spawn.
force-refresh re-research without prompting.
Do not prompt when the artifact exists.
