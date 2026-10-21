---
instruction_id: treat-a-broken-cross-link-as-not-yet-written-knowledge
title: Treat a broken cross-link as not-yet-written knowledge
summary: A link whose target does not exist yet is not a malformed document; it may be knowledge that is not written down yet.
capability_tags:
  - curate-context
pattern_tags:
  - cross-reference-linking
conditions_applies_when: A consumer reads a corpus that is still being written.
conditions_does_not_apply_when: The corpus is closed and every target is expected to exist.
artifact_contract_output_type: tolerated-link
artifact_contract_required_data:
  - the broken link
  - the reason it was not treated as malformed
artifact_contract_verified_by: the broken link was tolerated and the document was not rejected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Treat a broken cross-link as not-yet-written knowledge
Consumers MUST tolerate broken links: a link whose target does not exist in the bundle is not malformed; it may simply represent not-yet-written knowledge.
