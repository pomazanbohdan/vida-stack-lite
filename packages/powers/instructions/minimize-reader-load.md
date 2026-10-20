---
instruction_id: minimize-reader-load
title: Minimize reader load
summary: "Maintainability is the work a reader must do to understand code; track layers to trace and state to hold, and cut both."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: "You write code, an interface text, documentation, or an explanation for a person."
conditions_does_not_apply_when: A machine format has a fixed schema that cannot be shortened.
artifact_contract_output_type: reader-ready-text
artifact_contract_required_data:
  - main idea
  - what was cut
  - what was removed
  - check with a new reader
artifact_contract_verified_by: a read-through by someone seeing the material for the first time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-minimize-reader-load/SKILL.md
status: active
revision: 1
---

# Minimize reader load
Maintainability is the work a reader must do to understand code.
Track two axes: layers to trace and state to hold.
Layers to trace are the indirections between the question and the answer.
State to hold is hidden or mutable context the reader must keep in their head.
Line count, cyclomatic complexity, and "clean architecture" are proxies; reader load is the thing that matters.
The two axes are independent: a flat file with fifty globals can be as hard to reason about as a six-layer adapter stack.
Guard both.
Collapse layers that cost more than they save: wrappers with one caller, adapters with no second implementation, speculative indirection that was never needed.
Make adjacent layers change the abstraction; a layer that repeats the same methods and arguments adds reader load without compression.
Demand interface compression: prefer boundaries that hide meaningful decisions.
Shrink state scope: prefer pure functions, locals over fields, fields over module state, and module state over globals.
Derive instead of sync.
Name the invariant at the boundary, not in every consumer, so the reader learns it once.
Before adding a layer or a piece of state, ask whether it reduces reader load elsewhere by at least as much.
Can a new reader answer "where does X come from?" and "what can change X?" in under thirty seconds?
If not, cut layers or cut state.
