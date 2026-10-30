---
instruction_id: seed-the-discussion-with-sourced-findings-and-the-criteria
title: Seed the discussion with sourced findings and the criteria
summary: "The discussion is seeded with the sourced findings, the gains the evidence confirms, the acceptance criteria and the previous action items, so that every perspective is weighed against facts."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - code-audit
conditions_applies_when: A discussion of the findings is set up.
conditions_does_not_apply_when: No discussion was asked for.
artifact_contract_output_type: discussion-seed
artifact_contract_required_data:
  - the findings with their source references
  - the gains the evidence confirms
  - the acceptance criteria
  - the previous action items and whether they landed
artifact_contract_verified_by: "the seed carries the findings with their sources, the confirmed gains and the criteria, and every positive observation is grounded in fact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/team-discussion.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Seed the discussion with sourced findings and the criteria
Seed the discussion
with the consolidated Phase 2 findings and the epic context, so the installed agents react as real subagents with independent thinking rather than a scripted dialogue.
Seed it with:
- The findings, each with its source reference, grouped by the aggregate view or lens that produced it.
- The improvements the evidence confirms — real gains, patterns that worked — so positive observations are grounded in fact.
- The epic's acceptance criteria (or the profiled stand-in), so the discussion can weigh the verdict.
- The previous epic's action items and whether they landed, when a prior retro exists, so accountability is grounded in fact.
