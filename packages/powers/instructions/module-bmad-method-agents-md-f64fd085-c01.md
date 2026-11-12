---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-agents-md-f64fd085-c01"
title: "bmad-method: AGENTS.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:AGENTS.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"AGENTS.md\"}"
atom_ids:
  - assert-what-the-script-produced-never-what-the-model-wrote
  - leave-a-runtime-choice-in-the-text
  - write-a-conditional-as-a-block-not-inside-a-sentence
atom_count: 3
atoms: "[{\"atom_id\":\"assert-what-the-script-produced-never-what-the-model-wrote\",\"file_sha256\":\"ef436bbc192fef08525e2ada51ca7f7e4de7b3d36d5c1dda46103e01707ee362\",\"content_sha256\":\"dd56ccf0a3feb9111176ffa439353016e5145004d64e14784e3a4ef52d606b3a\",\"file_bytes\":2147,\"body_bytes\":704},{\"atom_id\":\"leave-a-runtime-choice-in-the-text\",\"file_sha256\":\"930e814caa13474faddcdefbf9d3e051396c8c5be21a4eb62a2262ba331934de\",\"content_sha256\":\"18d7c51105c9d3005ec39c25c60d9394c94551f6fa4da51b9f597e1447642d10\",\"file_bytes\":1279,\"body_bytes\":220},{\"atom_id\":\"write-a-conditional-as-a-block-not-inside-a-sentence\",\"file_sha256\":\"9983f8e4be0799d0a73b5e338281bb9f40d4c87e8741a7ffa0989c1dba1c15e3\",\"content_sha256\":\"18fc812972e591627c0b96cd135b951a6f36b59bab67003fc62e3c2856cb3673\",\"file_bytes\":1265,\"body_bytes\":252}]"
carrier_sha256: 4ede0521a3feb2980bf6344793628dbd2a25249613fa2e6e89f3c2390dadf038
carrier_bytes: 5152
revision: 1
status: active
---
<!-- vpmodule:atom:begin assert-what-the-script-produced-never-what-the-model-wrote -->
---
instruction_id: assert-what-the-script-produced-never-what-the-model-wrote
title: "Assert what the script produced, never what the model wrote"
summary: Tests assert what a script produced; they never assert what a model wrote or what a prompt file says.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
  - structural-design
conditions_applies_when: A skill ships scripts and their tests.
conditions_does_not_apply_when: The skill ships no script.
artifact_contract_output_type: script-contract
artifact_contract_required_data:
  - the work the script does
  - what the test asserts
  - the result format
artifact_contract_verified_by: the tests assert the script output and never the wording of a prompt file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/standards.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-determinism.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=AGENTS.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/design/verifier-reach.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assert what the script produced, never what the model wrote
Tests assert what a script produced, never what a model wrote or what a prompt file says.
JSON on stdout when a model reads the result.
argparse with `--help`.
Stdlib first, a graceful fallback when an optional import is absent.
No model ids or time estimates anywhere in a skill.
Automated tests assert outcomes produced by deterministic code.
Do not write automated tests for LLM output or for static source text.
- **Do** keep CI honest: test the **contract** the verifier consumes (parse/validate, projection round-trip, fail-closed guards), never assert the model's judgment as green. A test that grades the model's judgment is vacuous.
<!-- vpmodule:atom:end assert-what-the-script-produced-never-what-the-model-wrote -->
<!-- vpmodule:atom:begin leave-a-runtime-choice-in-the-text -->
---
instruction_id: leave-a-runtime-choice-in-the-text
title: Leave a runtime choice in the text
summary: A value the agent decides while running stays as prose with its alternatives; only values fixed before the render are rendered.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A decision is written into a workflow or a template.
conditions_does_not_apply_when: The value is already fixed before the run starts.
artifact_contract_output_type: decision-placement
artifact_contract_required_data:
  - the value
  - who decides it
  - where the alternatives stay
artifact_contract_verified_by: no value the agent decides at run time is resolved before the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=AGENTS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Leave a runtime choice in the text
Leave runtime choices as prose: when the model decides a value while running, the alternatives stay in the text.
Render-time conditionals are only for values fixed before the render.
<!-- vpmodule:atom:end leave-a-runtime-choice-in-the-text -->
<!-- vpmodule:atom:begin write-a-conditional-as-a-block-not-inside-a-sentence -->
---
instruction_id: write-a-conditional-as-a-block-not-inside-a-sentence
title: "Write a conditional as a block, not inside a sentence"
summary: A conditional in a template sits on its own lines; a whitespace difference in one variant is the acceptable price.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A template carries a conditional.
conditions_does_not_apply_when: The file carries no conditional.
artifact_contract_output_type: template-rule
artifact_contract_required_data:
  - the conditional
  - where it sits
  - the price paid for the readable source
artifact_contract_verified_by: no conditional sits inside a sentence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=AGENTS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write a conditional as a block, not inside a sentence
Write template conditionals as block-level `{% if %}` on their own lines, never inside a sentence; a whitespace-only difference in one rendered variant is an acceptable price for readable source.
<!-- vpmodule:atom:end write-a-conditional-as-a-block-not-inside-a-sentence -->