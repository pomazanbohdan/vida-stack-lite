---
instruction_id: give-machine-consumers-a-structured-error-channel
title: Give machine consumers a structured error channel
summary: "A tool that a program calls returns its failures in a structured form, so the caller reads the error instead of parsing the text mode or guessing from the exit code."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A tool is being built for a program that will call it.
conditions_does_not_apply_when: The tool is only ever read by a person.
artifact_contract_output_type: structured-error-channel
artifact_contract_required_data:
  - the structured error field
  - the exit code that accompanies it
  - what the text mode writes
artifact_contract_verified_by: the machine consumer received a structured error and the exit code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=scripts/changeset/README.md
status: active
revision: 1
---

# Give machine consumers a structured error channel
- **In default (text) mode, a failure is signalled by the exit code alone** — exit `1` from invalid semver or a missing changelog writes nothing to stdout. Machine consumers should pass `--json` to receive the `error` field.
