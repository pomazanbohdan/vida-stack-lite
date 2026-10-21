---
instruction_id: keep-the-author-and-the-verifier-apart
title: Keep the author and the verifier apart
summary: "Who produced a document and who confirmed it are recorded separately, because the one who wrote it need not be the one who confirmed it."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - trust-signals
conditions_applies_when: A document records how it was produced and how it was confirmed.
conditions_does_not_apply_when: The document was only produced and never confirmed.
artifact_contract_output_type: production-and-verification
artifact_contract_required_data:
  - who produced the document
  - when it was produced
  - who confirmed it
  - when it was confirmed
artifact_contract_verified_by: the producer and the verifier are recorded as separate entries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Keep the author and the verifier apart
`generated` records how the current content was produced.
`verified` records who or what has confirmed the content against its sources or `resource`.
They are kept distinct because who *wrote* a concept need not be who *confirmed* it.
`verified` is independent of `generated.at`: content can change without re-confirmation, and facts can be re-confirmed without regeneration.
