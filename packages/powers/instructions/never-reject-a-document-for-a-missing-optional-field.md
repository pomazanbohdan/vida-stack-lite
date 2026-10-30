---
instruction_id: never-reject-a-document-for-a-missing-optional-field
title: Never reject a document for a missing optional field
summary: "Only what a document cannot be read without is required; every other constraint is soft guidance, an unknown field is preserved rather than rejected, and a trust tier is a signal rather than a permission."
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer validates or round-trips the documents of a knowledge corpus.
conditions_does_not_apply_when: The document cannot be parsed at all.
artifact_contract_output_type: tolerant-read
artifact_contract_required_data:
  - the missing optional field
  - the unknown key that was preserved
  - the constraints that were treated as soft guidance
artifact_contract_verified_by: "the document was neither rejected for a missing optional field nor for an unknown key, the unknown key survived the round-trip, and the trust tiers were treated as advisory signals"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never reject a document for a missing optional field
All are optional.
**Extensions:** Producers MAY include any additional keys.
Consumers MUST NOT reject a bundle because of:
- Missing optional frontmatter fields.
- Unknown additional frontmatter keys.
- Broken cross-links.
- Missing `index.md` files.
Consumers SHOULD treat all other constraints as soft guidance.
Consumers SHOULD preserve unknown keys when round-tripping and MUST NOT reject documents with unrecognized fields.
Trust tiers are advisory signals, not access control.
