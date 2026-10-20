---
instruction_id: write-each-section-from-its-digests-in-their-words
title: "Write each section from its digests, in their words"
summary: "A section is written from the digests alone and in their words, each claim keeping the citation its digest gave it; the shared-method section appears only when two answers meet there."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The digests for a question have landed.
conditions_does_not_apply_when: The digests for the question have not landed yet.
artifact_contract_output_type: research-section
artifact_contract_required_data:
  - the section text
  - the citation on each claim
  - the shared-method section
artifact_contract_verified_by: every section comes from its digests and keeps the citations they carried
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
status: active
revision: 1
---

# Write each section from its digests, in their words
Write each question’s section as its digests land, from them alone and in their words, each claim with its citation as the digest gave it (code `path:line (symbol) @ sha`, history `sha "subject" #pr`); a `what touches X` section keeps every call site its digest cites, each with its citation, since the list is the answer.
- `## Where the answers meet`, after the question sections and only when two answers pass through the same method: each such method, the questions whose answers reach it, and the checks there that reject a value or throw, every line a claim the question sections already cite, with that citation.
