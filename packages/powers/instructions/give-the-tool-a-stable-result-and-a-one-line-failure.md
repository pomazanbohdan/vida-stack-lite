---
instruction_id: give-the-tool-a-stable-result-and-a-one-line-failure
title: Give the tool a stable result and a one-line failure
summary: "A tool prints one machine-readable result, exits non-zero with a one-line reason when it fails, and the agent reports that reason instead of doing the job by hand."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A script or command is wrapped so that an agent runs it and reads the result.
conditions_does_not_apply_when: The command is run by a person and its output is read by a person.
artifact_contract_output_type: tool-contract
artifact_contract_required_data:
  - the result shape
  - the exit codes
  - the failure line
artifact_contract_verified_by: a failure prints one line on stderr and the agent reports that line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/script-utility/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/script-utility/assets/SKILL-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 1
---

# Give the tool a stable result and a one-line failure
`SKILL.md` says what the script does, the one command that runs it, how to read its output, and what to do when it fails.
Nothing the script's `--help` already says.
It prints one JSON object with stable keys when a model reads the result, plain text when a person does.
On failure it exits non-zero with a one-line reason on stderr, so the agent reports instead of guessing.
A non-zero exit prints one line on stderr saying why. Report that line to the user; do not do the job by hand instead.
No network calls and no model ids baked in.
A script handles its own errors and says whether the agent runs it or reads it.
