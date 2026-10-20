---
instruction_id: test-the-tool-as-a-subprocess
title: Test the tool as a subprocess
summary: "Run the tool the way the agent calls it: as a separate process, on a fixture built in a temporary directory, covering the success path and the one-line failure."
capability_tags:
  - build-verification-harness
pattern_tags:
  - test-design
conditions_applies_when: A script or command is delivered and its behaviour has to be proven.
conditions_does_not_apply_when: "The result is judged by a person reading it, with no process boundary to cross."
artifact_contract_output_type: tool-test
artifact_contract_required_data:
  - the fixture
  - the success path
  - the failure path
artifact_contract_verified_by: the test runs the tool as a process and asserts on its exit code and its output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/script-utility/shape.md
status: active
revision: 1
---

# Test the tool as a subprocess
The test uses `unittest`, runs the script as a subprocess on a fixture built in a temp directory, and covers the success path and the one-line failure.
