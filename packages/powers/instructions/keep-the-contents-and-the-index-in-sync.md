---
instruction_id: keep-the-contents-and-the-index-in-sync
title: Keep the contents and the index in sync
summary: "List every nested file in the parent's index with one line and its path, so discovery never depends on the harness finding it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The instructions of a repository have nested files or linked documents.
conditions_does_not_apply_when: There is nothing nested and nothing linked.
artifact_contract_output_type: index
artifact_contract_required_data:
  - the nested files
  - the one-line entries
  - the paths
artifact_contract_verified_by: every nested file appears in the parent index with its path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Keep the contents and the index in sync
List every child in the parent's **Where things are** with one line and its path.
Discovery never depends on the harness finding it.
Entries SHOULD include the description from the linked concept's frontmatter.
