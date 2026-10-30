---
instruction_id: keep-the-script-and-the-prose-on-their-own-sides
title: Keep the script and the prose on their own sides
summary: "Work with one right answer per input belongs in a script and work that turns on meaning belongs in prose, and a line crossing either way is a defect."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A skill mixes prose instructions with the code that runs beside them.
conditions_does_not_apply_when: The work has no deterministic part at all.
artifact_contract_output_type: script-prose-boundary
artifact_contract_required_data:
  - the work that has one right answer per input
  - the work that turns on meaning
  - the script and its interface
artifact_contract_verified_by: "no prose line does work a test could check, and no script decides meaning or defers an error"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-determinism.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/standards.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/script-utility/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the script and the prose on their own sides
The bar: a script does work with one right answer per input; prose does work that turns on meaning. A line crossing either way is a defect.
Prose doing work a unit test could check: parsing, counting, path resolution, rendering a template, validating structure, diffing. The signal verbs: validate, count, extract, convert, compare, scan for, check structure, list all, diff. Important when paid on every invocation, Minor when occasional and cheap. Name the script and its interface.
A script deciding meaning: a regex or string match classifying intent, tone or quality rather than locating a delimiter. Critical when it gates later behavior, Important otherwise; it breaks when the phrasing shifts.
A script that defers errors to the model: swallows an exception, warns and exits 0, or returns partial output with no reason. Important; the model will treat it as success.
Judgment stays out of the script. When a result needs interpreting, `SKILL.md` says what each outcome asks the agent to do next; the script does not decide for it.
