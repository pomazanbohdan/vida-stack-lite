---
instruction_id: mark-the-package-record-as-a-record-and-not-an-entry-point
title: Mark the package record as a record and not an entry point
summary: "The folder that describes a package is read by the host and never run; the stub file in it exists only so the folder installs with the others, and it says never to invoke it."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: A package is described by a folder that the host reads.
conditions_does_not_apply_when: The folder is an entry point that a user or an agent invokes.
artifact_contract_output_type: package-record
artifact_contract_required_data:
  - the folder the host reads
  - the stub file
  - the statement that it is never invoked
artifact_contract_verified_by: the record folder is never presented as something to run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/modules.md
status: active
revision: 1
---

# Mark the package record as a record and not an entry point
A stub that marks the folder as a skill so it installs with the others.
It says never to invoke it.
