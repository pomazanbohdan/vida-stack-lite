---
instruction_id: select-the-relevant-subset-instead-of-citing-the-whole-file
title: Select the relevant subset instead of citing the whole file
summary: "The facts that matter for a task are selected out of a large store and handed over as a brief, instead of the whole file being cited into the context."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A large store of facts is available and a task needs some of them.
conditions_does_not_apply_when: The store is small enough to pass whole.
artifact_contract_output_type: subset-selection
artifact_contract_required_data:
  - the facts that were selected
  - the task they were selected for
  - what was left out
artifact_contract_verified_by: the relevant subset was selected and the whole file was not cited
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=examples/dynamic-context-management/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Select the relevant subset instead of citing the whole file
- select the relevant predicate subset for a task — the building block for just-in-time agent-brief assembly instead of hand-citing a 200 KB file.
