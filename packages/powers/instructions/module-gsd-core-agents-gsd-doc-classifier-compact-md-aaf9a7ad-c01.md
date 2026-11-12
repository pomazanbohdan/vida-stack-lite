---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-doc-classifier-compact-md-aaf9a7ad-c01"
title: "gsd-core: agents/gsd-doc-classifier.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-doc-classifier.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-doc-classifier.compact.md\"}"
atom_ids:
  - apply-the-taxonomy-to-the-source-instead-of-generating-a-summary
  - lock-only-an-accepted-architecture-decision
  - resolve-an-ambiguous-classification-by-precedence-and-record-it
atom_count: 3
atoms: "[{\"atom_id\":\"apply-the-taxonomy-to-the-source-instead-of-generating-a-summary\",\"file_sha256\":\"63b2ae7851489a44299e2d35c6d4af4ce904b456279266be3628dfd257a5aa08\",\"content_sha256\":\"8b0cec444ba47ca78b04a8106f1fed114bcaad3f8e932efb5c36fe7f8d0f9722\",\"file_bytes\":1564,\"body_bytes\":398},{\"atom_id\":\"lock-only-an-accepted-architecture-decision\",\"file_sha256\":\"4892aa7ad851f660f1b38d6970a2d03a6cd12b9c78c5479e97f735baf4860898\",\"content_sha256\":\"6746cad8afc459c7d8034b5f3c5bf3f47bfffd9668194157249e7a82e32cc73b\",\"file_bytes\":1451,\"body_bytes\":304},{\"atom_id\":\"resolve-an-ambiguous-classification-by-precedence-and-record-it\",\"file_sha256\":\"89b452d99b7a357a50e983e37d950683740a23c5888676e129d2519298a78d71\",\"content_sha256\":\"ed56583a898a53fe23a077ccdde014d24fa64a88f2e5325fdd817efab7b81c8f\",\"file_bytes\":1413,\"body_bytes\":237}]"
carrier_sha256: 85b3c41577910c5ac99745ce89ae6f16b35eef529535b6d247ae4ab1150b0492
carrier_bytes: 4941
revision: 1
status: active
---
<!-- vpmodule:atom:begin apply-the-taxonomy-to-the-source-instead-of-generating-a-summary -->
---
instruction_id: apply-the-taxonomy-to-the-source-instead-of-generating-a-summary
title: Apply the taxonomy to the source instead of generating a summary
summary: The rules are applied to what the document actually contains; nothing is inferred and an absent field is marked absent.
capability_tags:
  - triage-reports
pattern_tags:
  - source-hierarchy
conditions_applies_when: A document is classified against a taxonomy.
conditions_does_not_apply_when: The task is to write a new document.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the type
  - the fields present in the source
artifact_contract_verified_by: no field carries content that the source did not contain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Apply the taxonomy to the source instead of generating a summary
This is rule-application, not generation. Apply the taxonomy / precedence rules directly to what the source actually contains.
Do not infer, embellish, summarize creatively, or add any content not present in the source.
Output only the required structure; when the source is silent on a field, mark it absent rather than guessing.
<!-- vpmodule:atom:end apply-the-taxonomy-to-the-source-instead-of-generating-a-summary -->
<!-- vpmodule:atom:begin lock-only-an-accepted-architecture-decision -->
---
instruction_id: lock-only-an-accepted-architecture-decision
title: Lock only an accepted architecture decision
summary: A decision record counts as locked only when its status says accepted; proposed, draft and deprecated records stay unlocked.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - frozen-intent
conditions_applies_when: The lock state of an architecture decision record is determined.
conditions_does_not_apply_when: The document is not a decision record.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the status
  - the lock state
artifact_contract_verified_by: the lock state is true only for an accepted decision record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.compact.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Lock only an accepted architecture decision
`locked`: always `false` unless type is `ADR` with `Accepted` status
`Deprecated` is a valid ADR status: keep the record readable and leave it unlocked
Classify a `Proposed`, `Draft` or `Deprecated` ADR as `locked: true` — only `Accepted` counts as locked
<!-- vpmodule:atom:end lock-only-an-accepted-architecture-decision -->
<!-- vpmodule:atom:begin resolve-an-ambiguous-classification-by-precedence-and-record-it -->
---
instruction_id: resolve-an-ambiguous-classification-by-precedence-and-record-it
title: Resolve an ambiguous classification by precedence and record it
summary: "When two types compete, the higher-precedence signal decides and the ambiguity is written down."
capability_tags:
  - triage-reports
pattern_tags:
  - source-hierarchy
conditions_applies_when: Two document types compete for the same file.
conditions_does_not_apply_when: One type is clearly indicated by frontmatter or file name.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the chosen type
  - the recorded ambiguity
artifact_contract_verified_by: the type follows the precedence order and the ambiguity is noted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-classifier.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resolve an ambiguous classification by precedence and record it
Ambiguity rule: If two types compete at roughly equal strength, pick the one with the highest-precedence signal (ADR > SPEC > PRD > DOC). Record the ambiguity in `notes`.
<!-- vpmodule:atom:end resolve-an-ambiguous-classification-by-precedence-and-record-it -->