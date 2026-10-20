---
instruction_id: pin-the-codebase-research-to-a-repository-and-commit
title: Pin the codebase research to a repository and a commit
summary: "A codebase research document names the repository, the full commit and the branch it was read at, so that the answer can be checked against the same code."
capability_tags:
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: Research is carried out against a codebase.
conditions_does_not_apply_when: The research reads published sources rather than a repository.
artifact_contract_output_type: pinned-research
artifact_contract_required_data:
  - the repository
  - the full commit
  - the branch
artifact_contract_verified_by: "the document names the repository, the full commit and the branch"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 1
---

# Pin the codebase research to a repository and a commit
title: 'Codebase research: {subject}'
type: codebase
repository: '{repository}'
commit: '{full commit}'
branch: '{branch}'
