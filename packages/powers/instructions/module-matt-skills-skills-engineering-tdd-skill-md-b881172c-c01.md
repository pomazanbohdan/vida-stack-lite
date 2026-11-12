---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-tdd-skill-md-b881172c-c01"
title: "matt-skills: skills/engineering/tdd/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/tdd/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/tdd/SKILL.md\"}"
atom_ids:
  - agree-test-seams-first
  - build-vertical-slices
atom_count: 2
atoms: "[{\"atom_id\":\"agree-test-seams-first\",\"file_sha256\":\"6a385ab953c66d6799b3d40e6b3a6b6954ee8592a14e580a520448470bfb63db\",\"content_sha256\":\"5f5c9a167941496dc2a0ff05a7f2ad9869ddcb71ce871010302d62a114c7f089\",\"file_bytes\":1954,\"body_bytes\":954},{\"atom_id\":\"build-vertical-slices\",\"file_sha256\":\"2be0acfa36eab2ffbe4f45e452179e86e401ba0c26acea141a4a4ae312944f45\",\"content_sha256\":\"deab6b26b8026c2f1342513bcb80477b516823f2174f5cee0d9c3a96d7a59d65\",\"file_bytes\":3410,\"body_bytes\":1992}]"
carrier_sha256: e99d7d59ca926cce3db5bfccc8e8e5fd2bbcd40602bca9e97a11ed9867f2eabb
carrier_bytes: 5565
revision: 1
status: active
---
<!-- vpmodule:atom:begin agree-test-seams-first -->
---
instruction_id: agree-test-seams-first
title: Agree test seams first
summary: "Agree the seams under test with the user before writing any test, and note what each seam catches and misses."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: Tests must be written and there is a choice of where to place them.
conditions_does_not_apply_when: The seam is fixed by the framework or already agreed.
artifact_contract_output_type: seam-plan
artifact_contract_required_data:
  - seams under test
  - what each catches
  - what each misses
artifact_contract_verified_by: no test is written at an unconfirmed seam
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/SKILL.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Agree test seams first
A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.
**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.
Ask: "What's the public interface, and which seams should we test?" Give each proposed seam a one-line note on what it catches and what it misses.
When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), use the shared design vocabulary for the module, interface, depth, seam, adapter, leverage and locality terms; it is a reference to consult, not a session to run.
<!-- vpmodule:atom:end agree-test-seams-first -->
<!-- vpmodule:atom:begin build-vertical-slices -->
---
instruction_id: build-vertical-slices
title: Build vertical slices
summary: "Work one vertical slice at a time: one test, one minimal implementation, each slice a tracer bullet through every layer."
capability_tags:
  - write-tests-first
pattern_tags:
  - vertical-slicing
conditions_applies_when: A feature or fix is built test-first and could be sliced horizontally or vertically.
conditions_does_not_apply_when: The work is a single trivial change.
artifact_contract_output_type: vertical-slice
artifact_contract_required_data:
  - slice
  - one test
  - minimal implementation
artifact_contract_verified_by: each slice is demoable on its own and the suite stays green after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/incremental-implementation/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-mvp-mode.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Build vertical slices
- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage, not the red → green implementation cycle.
Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.
**Horizontal slicing** (writing all tests first, then all implementation) verifies _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation.
## Vertical slices are preferred
Build one complete path through the stack:
```
Slice 1: Create a task (DB + API + basic UI)
    → Tests pass, user can create a task via the UI

Slice 2: List tasks (query + API + UI)
    → Tests pass, user can see their tasks

Slice 3: Edit a task (update + API + UI)
    → Tests pass, user can modify tasks

Slice 4: Delete a task (delete + API + UI + confirmation)
    → Tests pass, full CRUD complete
```
Each slice delivers working end-to-end functionality.

**Core Rule**
**Decompose by feature slice, not by technical layer.** Every task must move the user-facing capability forward. After each task, a real user can click through more of the feature than they could before.
**Forbidden** under tracer-first:
- "Create the database schema" as a standalone task
- "Build the API layer" as a standalone task
- "Wire up the UI" as a final integration task
**Acceptance Test for Your Plan**
Before emitting the plan, ask: **after Task N completes, can a real user *do* something they could not do after Task N-1?** If the answer is "no, but the foundation is laid", you have a horizontal task disguised as a slice. Restructure.
<!-- vpmodule:atom:end build-vertical-slices -->