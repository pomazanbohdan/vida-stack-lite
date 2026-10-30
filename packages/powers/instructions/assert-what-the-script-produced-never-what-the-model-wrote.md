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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/standards.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-determinism.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=AGENTS.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/design/verifier-reach.md
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
