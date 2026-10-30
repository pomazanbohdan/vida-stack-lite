---
instruction_id: converge-on-target-architecture
title: Converge on the target architecture
summary: "You own the contract; the structure changes and the behavior does not. Pin behavior, name the target shape, and move in small behavior-preserving steps."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: The current structure obstructs change and needs a stepwise rebuild.
conditions_does_not_apply_when: A local fix without a structural change is enough.
artifact_contract_output_type: convergence-plan
artifact_contract_required_data:
  - target state
  - current state
  - steps
  - temporary compromises
artifact_contract_verified_by: "the project's checks passing after every step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/refactoring.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/adoption-guide.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Converge on the target architecture
You own the contract: the structure changes, the behavior does not.
If cleanup reveals a missing feature or a real bug, split it out and ship the structural change first against the pinned contract.
Pin the behavior contract first with a characterization test, snapshot, or equivalence harness that captures current behavior before any structure moves.
If the area has no coverage, write the pin before touching structure.
Type check and lint are not a pin.
Name the structure the code is missing.
Boring code stays when the shape is already clear and local.
The reshape must delete branches or invalid states, not add indirection.
Name the target shape: what the module layout, types, and call graph should be if built today.
Subtract before you add.
Delete dead code, collapse one-caller wrappers, drop redundant validators, and remove orphan references before introducing the new shape.
The smallest change that reaches the target shape ships.
A speculative cleanup that "might help" gets reverted.
Move in small behavior-preserving steps, each keeping the pin green.
For API reshapes, migrate every caller and delete the old API in the same wave.
No compatibility shims, no parallel old-and-new paths.
Spot-check every rename against the actual files; renames silently miss usages in strings, prose, and back-references.
Prove behavior is unchanged on the real artifact, not "it compiles".
For larger reshapes, run an equivalence check: a script that diffs old-vs-new outputs, a recorded baseline replayed against the new code, or a smoke run on the matching surface.
Confirm the change is worth keeping: the success measure is reduced reader load.
If the diff does not lower reader load somewhere, revert it.
Rebase into small ordered commits: a subtraction commit, then the reshape, then any follow-on cleanup.
Don't aim for global coverage; aim for coverage _where change is planned_. For untested legacy behavior, write characterization tests, tests that pin down what the code currently does, right or wrong, before any modification. The Beyonce Rule applies: if the agent liked a behavior enough to depend on it, it should have put a test on it.
Goal: every area the agent will touch gets a safety net first.
No characterization tests, no refactor. This is the single most expensive shortcut in brownfield adoption.
Chesterton's Fence is the operative principle: the skill forces the agent to understand _why_ code exists before removing it.
Behavior-preserving simplification plus characterization tests is the lowest-risk way to make legacy code changeable.
Treating the legacy system's behavior as wrong by default. Chesterton's Fence: the weird retry loop may be load-bearing. Understand, then change.
