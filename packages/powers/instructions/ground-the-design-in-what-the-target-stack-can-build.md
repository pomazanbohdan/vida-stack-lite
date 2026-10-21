---
instruction_id: ground-the-design-in-what-the-target-stack-can-build
title: Ground the design in what the target stack can build
summary: "Before anything is designed, the target stack is identified, its available primitives and its constraints are checked, and at least one direction follows the path of least resistance."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - design-system-adherence
conditions_applies_when: A design is about to be produced for a target implementation.
conditions_does_not_apply_when: There is no target stack yet and the work is free-form exploration.
artifact_contract_output_type: stack-grounding
artifact_contract_required_data:
  - the target stack
  - the primitives it provides
  - the constraints that affect the design
artifact_contract_verified_by: the design only uses what the stack can build and one direction follows the easiest path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch.md
status: active
revision: 1
---

# Ground the design in what the target stack can build
Before sketching, ground the design in what's actually buildable.
**a. Identify the target stack.** Check for package.json, Cargo.toml, etc.
**b. Check component/pattern availability.** Use context7 (resolve-library-id → query-docs) or web search to answer:
**c. Note constraints that affect design:**
Platform conventions (iOS nav patterns, desktop menu bars, terminal grid constraints)
Framework limitations (what's easy vs requires custom work)
Existing design tokens or theme systems already in the project
**d. Let research inform variants.** At least one variant should follow the path of least resistance for the target stack.
**Skip when unnecessary.** Greenfield project with no stack, or user says "just explore visually." The point is grounding, not gatekeeping.
