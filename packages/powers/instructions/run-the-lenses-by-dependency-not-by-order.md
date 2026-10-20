---
instruction_id: run-the-lenses-by-dependency-not-by-order
title: "Run the lenses by dependency, not by order"
summary: A lens without a dependency never sees another lens’s findings; a lens with a dependency runs on top of the lens it names and still runs when that lens produced nothing.
capability_tags:
  - review-code
  - parallelize-tasks
pattern_tags:
  - code-review
  - parallel-execution
conditions_applies_when: Several lenses will run over the same content and some of them name the lens they build on.
conditions_does_not_apply_when: Only one lens runs.
artifact_contract_output_type: lens-run-order
artifact_contract_required_data:
  - the independent lenses
  - the dependent lenses and the lens each depends on
  - the findings each dependent lens received
artifact_contract_verified_by: "no independent lens saw another lens’s findings, and every dependent lens names what it ran on"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 1
---

# Run the lenses by dependency, not by order
Run the independent lenses — every selected lens without `after`. Each sees the content and `also_consider`, never another lens's findings.
Run the dependent lenses — every selected lens with `after`, once the lens it names has completed, passing that lens's findings in.
A lens whose `after` target was not selected or produced nothing still runs, with no prior findings.
Dependent lenses that name different targets are independent of each other
Launch every ready one before handling any of their results.
