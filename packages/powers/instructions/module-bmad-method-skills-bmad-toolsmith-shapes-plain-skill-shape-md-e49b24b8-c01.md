---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-shapes-plain-skill-shape-md-e49b24b8-c01"
title: "bmad-method: skills/bmad-toolsmith/shapes/plain-skill/shape.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-toolsmith/shapes/plain-skill/shape.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/shapes/plain-skill/shape.md\"}"
atom_ids:
  - give-the-tool-a-stable-result-and-a-one-line-failure
  - keep-one-reader-and-one-writer-for-overrides
  - put-one-right-answer-work-in-a-script
atom_count: 3
atoms: "[{\"atom_id\":\"give-the-tool-a-stable-result-and-a-one-line-failure\",\"file_sha256\":\"853d4ccd762efb4f8eb716b5a20cea8b2416c988ae87aeb4cb25d5796fd2ac8b\",\"content_sha256\":\"45ed2889f30e38b6a8d80db1dcead735a74a49ce6c45bbe4981f30e33e34d786\",\"file_bytes\":2448,\"body_bytes\":830},{\"atom_id\":\"keep-one-reader-and-one-writer-for-overrides\",\"file_sha256\":\"39329c5309c9ab207d7057a0c923423ca3e39b28e1627c10a9c5fd918a9ecc70\",\"content_sha256\":\"503381369b88c298d780b4612c50e1c1978f015a36f4ba4221324fd0438e4fed\",\"file_bytes\":2045,\"body_bytes\":645},{\"atom_id\":\"put-one-right-answer-work-in-a-script\",\"file_sha256\":\"fe1ca9e7c51e6b530ae83f6c04e4e7ac507a263b4a19638f6c935975c915c6ee\",\"content_sha256\":\"576c5a4dec2732d1962bc9d13080fae7a53b2ca62b43ed7caa59fd496ffab222\",\"file_bytes\":2495,\"body_bytes\":1100}]"
carrier_sha256: a13bed8ebffebcf675791cd61e9f42812ae7d2b1d9b5bbe84ce8cd50b03cc1a1
carrier_bytes: 7427
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-the-tool-a-stable-result-and-a-one-line-failure -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/script-utility/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/script-utility/assets/SKILL-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=scripts/changeset/README.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Give the tool a stable result and a one-line failure
`SKILL.md` says what the script does, the one command that runs it, how to read its output, and what to do when it fails.
Nothing the script's `--help` already says.
It prints one JSON object with stable keys when a model reads the result, plain text when a person does.
On failure it exits non-zero with a one-line reason on stderr, so the agent reports instead of guessing.
A non-zero exit prints one line on stderr saying why. Report that line to the user; do not do the job by hand instead.
No network calls and no model ids baked in.
A script handles its own errors and says whether the agent runs it or reads it.
- `extract` resolves to one of three exit codes. The output shape depends on whether `--json` is passed.
- A `no releases found in range` notice on stderr.
<!-- vpmodule:atom:end give-the-tool-a-stable-result-and-a-one-line-failure -->
<!-- vpmodule:atom:begin keep-one-reader-and-one-writer-for-overrides -->
---
instruction_id: keep-one-reader-and-one-writer-for-overrides
title: Keep one reader and one writer for the overrides
summary: "The overrides live outside the skill and are written by one component and read by another; the skill never writes its own overrides, never ships its own merge script and never carries a second code path."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A skill reads override values that somebody else writes.
conditions_does_not_apply_when: There are no overrides.
artifact_contract_output_type: override-contract
artifact_contract_required_data:
  - the reader
  - the writer
  - what the skill must not do itself
artifact_contract_verified_by: the skill never writes its own overrides
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-customization.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/shape-agent.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep one reader and one writer for the overrides
One reader, one writer.
A skill never writes its own overrides, never ships its own merge script, and never carries a second code path.
A rendered skill or rendered agent uses the renderer as its only reader; it never re-reads the override files itself.
The three layers merge when the skill activates: scalars override, arrays append, arrays of tables merge by `code` or `id`.
So a team can add a capability, change the communication style or add an activation step without forking.
When users will change a value, one line in the body says to invoke the customization skill and name the key.
<!-- vpmodule:atom:end keep-one-reader-and-one-writer-for-overrides -->
<!-- vpmodule:atom:begin put-one-right-answer-work-in-a-script -->
---
instruction_id: put-one-right-answer-work-in-a-script
title: Put one-right-answer work in a script
summary: "Work with one right answer per input belongs in a script; work that turns on meaning belongs in prose; a line on the wrong side is a defect, and the test asserts what the script produced."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - structural-design
conditions_applies_when: A line of a skill could be a script or could be prose.
conditions_does_not_apply_when: "The work needs judgment, tone or a decision about meaning."
artifact_contract_output_type: agent-skill
artifact_contract_required_data:
  - the work
  - the side it was put on
  - why
artifact_contract_verified_by: the work comes out the same way on every run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/craft-scripts.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/shape-script-utility.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Put one-right-answer work in a script
A script does work that has one right answer per input: parsing, counting, resolving paths, validating structure, rendering a template, diffing, generating random values.
Prose does work that turns on meaning: judgment, tone, what to do with a result.
A line on the wrong side is a defect the review catches: prose counting tokens or checking structure is paid on every run and done differently each time; a script deciding what a sentence means breaks when the phrasing shifts.
It fits when most of the job has one right answer per input: transforming files, counting, checking structure, generating from fixed rules, resolving paths.
Prose would do that worse and differently every run.
The skill's prose stays for the part that turns on meaning: what to do with the result.
Tests assert what a script produced, never what a model wrote or what a prompt file says.
Three degrees of freedom: prose where the agent judges, a parameterised pattern where a preferred way exists, a script where the sequence is fragile or every run would rewrite the same helper.
<!-- vpmodule:atom:end put-one-right-answer-work-in-a-script -->