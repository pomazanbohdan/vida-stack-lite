---
instruction_id: derive-the-truths-the-artifacts-the-wiring-and-the-key-links
title: "Derive the truths, the artifacts, the wiring and the key links"
summary: "A goal is decomposed into observable truths, the artifacts each truth needs, the wiring that feeds them and the links whose failure cascades."
capability_tags:
  - plan-implementation
pattern_tags:
  - working-backwards
conditions_applies_when: A goal has to be turned into a plan.
conditions_does_not_apply_when: The plan already exists and only needs a revision.
artifact_contract_output_type: goal-derivation
artifact_contract_required_data:
  - the observable truths
  - the artifacts
  - the wiring
  - the key links
artifact_contract_verified_by: every truth is verifiable by a human and every artifact is a specific file or object
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 1
---

# Derive the truths, the artifacts, the wiring and the key links
### Step 2: Derive Observable Truths
### Step 3: Derive Required Artifacts
### Step 4: Derive Required Wiring
### Step 5: Identify Key Links
**Test:** Each truth verifiable by a human using the application.
**Test:** Each artifact = a specific file or database object.
"Where is this most likely to break?" Key links = critical connections where breakage causes cascading failures.
