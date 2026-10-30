---
instruction_id: match-the-fan-out-shape-to-the-question
title: Match the fan-out shape to the question
summary: "Breadth-first splits the dimensions, depth-first splits the perspectives on one question, and a focused ask gets one worker — never more than it needs."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several workers could be started for a round.
conditions_does_not_apply_when: The round is a single focused lookup.
artifact_contract_output_type: fan-out-shape
artifact_contract_required_data:
  - the topology chosen
  - the split rule
  - the reason
artifact_contract_verified_by: the shape matches the shape of the question and no fan-out exceeds what the question needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Match the fan-out shape to the question
Fan out researcher assistants for the round — concurrency per the resolved `subagents` level, split by the plan’s **topology**: breadth-first gives each assistant independent sub-questions; depth-first gives each a distinct perspective or methodology on the *same* question; straightforward is one assistant with a small budget — never fan out what one focused assistant answers.
- straightforward (a focused ask: one assistant, a handful of calls, no fan-out — never overinvest in a simple query)
