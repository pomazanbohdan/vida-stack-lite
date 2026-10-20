---
instruction_id: keep-a-line-only-when-it-prevents-a-named-failure
title: Keep a line only when it prevents a named failure
summary: "A line earns its place only when it prevents a failure the model would otherwise make, and you can name the different action it causes."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - code-minimization
conditions_applies_when: A line of an instruction is judged for its value.
conditions_does_not_apply_when: The line names a convention the model cannot look up.
artifact_contract_output_type: justified-line
artifact_contract_required_data:
  - the line
  - the failure it prevents
  - the different action the model takes because of it
artifact_contract_verified_by: the different action the model takes without the line can be named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 1
---

# Keep a line only when it prevents a named failure
The core test. Would a capable model do this correctly without being told? If yes, cut. A line earns its place only by preventing a failure. It stays when you can name the different action the model takes without it.
Core-test failures: lines a capable model follows unprompted. "Make sure", "don't forget", templates that teach markdown, mechanics of a tool the model drives fluently, scoring formulas for judgment.
- Minor for a line or two
- Important for a section
