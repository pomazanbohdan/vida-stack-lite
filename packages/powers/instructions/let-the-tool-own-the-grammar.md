---
instruction_id: let-the-tool-own-the-grammar
title: Let the tool own the grammar
summary: The argument grammar belongs to the tool that implements it; the caller validates against it instead of re-implementing the parsing.
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - single-source-of-truth
  - untrusted-content-handling
conditions_applies_when: A command takes a block of arguments that the tool itself parses.
conditions_does_not_apply_when: The caller wrote the parser and owns it.
artifact_contract_output_type: validated-arguments
artifact_contract_required_data:
  - the raw argument block
  - the parsed result the tool returned
artifact_contract_verified_by: the arguments were parsed by the tool and the caller did not re-implement the grammar
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch.md
status: active
revision: 1
---

# Let the tool own the grammar
Validate the command's `<arguments>` block through the CLI's own grammar — never re-derive it inline
