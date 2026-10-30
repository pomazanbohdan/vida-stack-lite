---
instruction_id: classify-the-failure-then-route-the-investigation
title: "Classify the failure, then route the investigation"
summary: "The failure is classified as deterministic, transient or concurrent in one sentence, and the class decides which investigation technique comes first."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A failure is about to be investigated and the technique has to be chosen.
conditions_does_not_apply_when: The cause is already known and only the fix is left.
artifact_contract_output_type: failure-class
artifact_contract_required_data:
  - the class of the failure
  - the route the class selects
  - the evidence the class rests on
artifact_contract_verified_by: the chosen class and strategy are written down so the decision is inspectable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-bug-taxonomy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the failure, then route the investigation
Classification takes one sentence and routes the rest.
Bohrbug — solid, deterministic, always reproduces under the same inputs
Heisenbug / Mandelbug — transient, non-deterministic, changes under observation
Mandelbug specifically covers aging-related failures (resource exhaustion, uptime-dependent state, slow accumulation) whose cause is tangled with the system rather than purely timing.
Concurrency — atomicity-violation, order-violation, or deadlock (the Lu et al. 2008 classification) arising from interleaved execution.
If the class is genuinely unclear after one observation, gather one more piece of evidence (does it reproduce on immediate retry? does it depend on uptime?) rather than forcing a guess
Where a class route and a situation-based hunch disagree, the class route wins
The chosen class and strategy are written to the debug file so the decision is inspectable.
