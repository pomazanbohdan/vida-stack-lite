---
instruction_id: coordinate-a-program-of-delegated-work
title: Coordinate a program of delegated work
summary: "Own the program and never the code: author the briefs, drain the queue, keep the frontier green, and decide."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: "The work outlives any single agent: multi-day, many stacked PRs, and a fleet of subagents."
conditions_does_not_apply_when: "One agent could finish the work inside the session's budget."
artifact_contract_output_type: program-plan
artifact_contract_required_data:
  - done predicate
  - tracks
  - unit and verdict tables
  - frontier
  - gates
artifact_contract_verified_by: each part checked at its merge point before the next starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/orchestrate.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/autopilot-full.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/swarm/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/implement-spec/SKILL.md
status: active
revision: 2
---

# Coordinate a program of delegated work
You own the program, never the code.
Author briefs, drain the queue, keep the frontier green, and decide.
Route here when the work outlives any single agent; work one agent could finish inside the session's budget is not a program.
Ceremony must scale with the program, and on cheap near-identical units you collapse it.
Completions are queue events, not interrupts.
Every spawn and every resume carries the standing orders verbatim.
The brief is the product; a vague brief fails quietly, because a worker cannot ask you a question.
Frame the program: state the done predicate as something countable, such as all units merged and each one ledger-verified.
Quantify scope: units, rough effort, expected stacks, and the wall-clock budget.
If one agent could finish inside that budget, stop here and run a single autonomous run instead.
Name the tracks per project.
A contested decomposition or a one-way door goes through the arena before the pilot.
Present the framing once, and let reversible prep proceed without waiting.
Pilot: push one unit through the whole path of brief, worker, verification, stack entry, ledger row, and merge.
The pilot exists to falsify the brief template, the verify recipe, and the unit size while that costs one agent instead of fifty.
Fix the contract from pilot evidence before any fan-out.
Scale a rolling window of workers up to the in-flight cap, refilling as children finish, because blocking batches pay the slowest child of every batch.
Recompute ready work after each drain, and relay upstream reports into downstream briefs.
Drain in batches at the end of a critical section, a track rollup, a frontier watcher wake, and before a human report.
Each drain classifies every pointer as landed, needs-verify, failed, zombie, or noise, and writes the resulting rows.
Landing is continuous, never a terminal phase.
Keep the frontier green before upper-stack work, and advance the frontier only on merge or reported new head SHAs.
Account for every spawned child at its track's rollup: arrived, respawned, or its scope explicitly absorbed.
Never resume an agent to check on it; probe read-only through the ledger, the unit table, the forge, and pushed branches.
A silent death gets a synthetic postmortem row, and you replan on evidence as it arrives.
Retry by mode: cap-hit or out-of-memory respawns with smaller scope, a network drop retries as-is, a tool error retries on a different model, and an unknown error retries once; two retries, then abandon the unit and replan around it.
Fan work across independent slices when parallelism buys coverage: each worker gets its own scope and check.
Each worker reports PASS, ISSUES, or BLOCKED, and the parent returns one compact report with any gaps or dropouts.
Close: reconcile every spawned agent to a terminal row, confirm the predicate on the real artifact, and confirm every landed PR has a verdict for its current head SHA.
Encode recurring corrections into the standing orders or the brief template.
The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed. Communication to and from subagents should be sparse. Communicate primarily through **context pointers**: to the spec, tickets, research notes, and previous commits. Don't duplicate information already available via pointers. Implementer subagents should be run in the background where possible for maximum concurrency. Once an implementer subagent completes, merge its work with a merger subagent. If this changes the frontier of available tickets, kick off more implementer subagents to work on the new tickets. This allows for maximum concurrency.
