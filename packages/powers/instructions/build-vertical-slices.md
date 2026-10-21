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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-mvp-mode.md
status: active
revision: 4
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
