---
instruction_id: keep-a-record-by-subject-and-replace-what-is-no-longer-true
title: Keep a record by subject and replace what is no longer true
summary: "Keep what is remembered in small files by subject: a standing file says what is true now and its sections are replaced rather than appended, a dated line is added only at a turning point, and nothing is deleted for being old."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A growing body of remembered material has to stay usable.
conditions_does_not_apply_when: The material is a single short note.
artifact_contract_output_type: knowledge-store
artifact_contract_required_data:
  - the subject files
  - what was replaced
  - the distilled material
artifact_contract_verified_by: a standing file states what is true now and keeps only a dated line at a turning point
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-memory-agent.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/assets/HOW-I-REMEMBER-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/assets/intake-capability-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/assets/first-breath-template.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/context-md.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep a record by subject and replace what is no longer true
A standing file says what is true now; its sections are replaced, never appended, except a `## History` section that takes a dated line only at a turning point.
Memory stays good by being tended, not by growing.
the agent distills it into subject files that link back, marks it distilled, and reads the distillations from then on
Nothing is deleted for being old.
No index: the agent finds things with `ls` and `grep`, and the map is generated.
Four moves: distill every raw file that is still marked raw into subject files that link back, then mark it distilled; merge two files about one subject into one; refresh any standing file a recent session note contradicts, replacing the line; raise what the owner should hear next time in the pending file.
Tending (distill, merge, refresh, raise) is triggered by the staleness line, not a size.
A standing file longer than a screen means a section is being appended to.
The material is kept as given, and what it holds is kept as one small file per subject it touched, each linked back to the raw file.
The future self will read the distillations and never the raw again, so a distillation must stand on its own: who, what, when, what was decided, what is still open.
Ask before distilling only when the material's date, area or owner is not in it.
A recording is transcribed first, with the tool the owner has, and the transcript is the raw file.
Clean up seed text — scan your memory files for any remaining `{...}` placeholder instructions from the templates.
Don't leave template scaffolding in your living files.
- It is never edited by hand during normal operation — the workflow writes it and downstream agents read it as a sealed source of truth.
- Ideas that arose in discussion but belong in other phases. Preserved so they are not lost.
