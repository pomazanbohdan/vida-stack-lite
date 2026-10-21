---
instruction_id: run-the-shared-hook-once-per-wave-not-once-per-commit
title: "Run the shared hook once per wave, not once per commit"
summary: "A hook that guards a shared build artefact runs once for the whole group of parallel commits instead of once per commit, so the parallel commits cannot fight over the same lock."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several agents will commit in parallel and a hook guards a shared build artefact.
conditions_does_not_apply_when: The commits are made one at a time.
artifact_contract_output_type: wave-hook-run
artifact_contract_required_data:
  - the hook that runs once per wave
  - the contention it avoids
  - what the parallel commits skip
artifact_contract_verified_by: the hook ran once for the wave and the parallel commits did not fight over the lock
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 1
---

# Run the shared hook once per wave, not once per commit
- the orchestrator runs the pre-commit hook once for the wave as a whole. Executors commit with `--no-verify` to prevent build-lock contention (for example, Cargo lock fights in Rust projects) when multiple agents commit in parallel.
- The hook therefore runs once per wave rather than once per commit.
