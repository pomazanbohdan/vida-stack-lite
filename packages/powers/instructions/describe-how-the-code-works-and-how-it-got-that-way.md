---
instruction_id: describe-how-the-code-works-and-how-it-got-that-way
title: Describe how the code works and how it got that way
summary: "The document says how the relevant code works at one commit and how it got that way, with every claim cited to a line or a commit, and it names its readers."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A research document about a repository is being written.
conditions_does_not_apply_when: The work is a code change rather than a description of existing code.
artifact_contract_output_type: codebase-research-document
artifact_contract_required_data:
  - how the code works at the commit
  - how it got that way
  - the citation on every claim
artifact_contract_verified_by: every claim carries a citation to a line or a commit and the document covers one commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/research.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Describe how the code works and how it got that way
One ask about a repository, whether a question, a ticket or a goal, becomes a short document that says how the relevant code works at one commit and how it got that way, every claim cited to a line or a commit
- Its readers are the plan step that will change the code and a person checking one claim
and no recommendation in it: what to change is the reader's choice.
