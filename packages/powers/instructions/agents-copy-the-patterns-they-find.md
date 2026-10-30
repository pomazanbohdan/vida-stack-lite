---
instruction_id: agents-copy-the-patterns-they-find
title: Agents copy the patterns they find
summary: "An agent copies the patterns it finds, so a project that does the same thing several ways makes every session inconsistent; clean up the inconsistency first when the quality is low."
capability_tags:
  - audit-codebase
pattern_tags:
  - project-conventions-first
conditions_applies_when: The output of one session differs from the output of the next.
conditions_does_not_apply_when: The inconsistency comes from the instruction rather than from the code.
artifact_contract_output_type: codebase-assessment
artifact_contract_required_data:
  - the patterns found more than once
  - the inconsistency to remove
artifact_contract_verified_by: the inconsistency in the repository is named as the cause of the inconsistent output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/preparing-a-repo-for-agents.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Agents copy the patterns they find
An agent copies the patterns it finds.
When the project does the same thing several different ways, the agent cannot be consistent either, and each session may pick a different way.
Clean structure. Very large files and tangled modules cost every session tokens and accuracy.
If the codebase is inconsistent or untested, some refactoring and test work first goes a long way, and it pays back in every later session.
