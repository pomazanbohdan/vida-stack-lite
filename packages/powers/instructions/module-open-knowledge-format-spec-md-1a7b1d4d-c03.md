---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-spec-md-1a7b1d4d-c03"
title: "open-knowledge-format: SPEC.md module"
summary: "Carrier for 8 atomic instructions from open-knowledge-format:SPEC.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"SPEC.md\"}"
atom_ids:
  - read-the-new-field-and-fall-back-to-the-old-one
  - record-the-sources-a-concept-was-derived-from
  - require-a-type-on-every-concept-document
  - state-the-kind-of-a-relationship-in-the-prose-not-in-the-link
  - supply-only-the-parameter-values-never-the-computation
  - surface-the-attestation-verdict-instead-of-dropping-it
  - synthesize-the-listing-when-the-corpus-has-none
  - synthesize-the-tag-view-at-consumption-time
atom_count: 8
atoms: "[{\"atom_id\":\"read-the-new-field-and-fall-back-to-the-old-one\",\"file_sha256\":\"1e06e9866abc0a386d338ab17184b11164ec0226654b48cc3970d54213d720f6\",\"content_sha256\":\"4221faa351275d46547f9dccc1742a4d0a2fe4b61e2fb4add2e87f7941648db8\",\"file_bytes\":1373,\"body_bytes\":231},{\"atom_id\":\"record-the-sources-a-concept-was-derived-from\",\"file_sha256\":\"5a3c5e8de6001a22e664ec6d7bf389f5902b691009a58b8544d1152eda397bb3\",\"content_sha256\":\"902445d74e8d716bb05b294b2c3ef194949f3ee0d4b593cbc2f2d72331356f7b\",\"file_bytes\":1756,\"body_bytes\":594},{\"atom_id\":\"require-a-type-on-every-concept-document\",\"file_sha256\":\"d80c3e28a691bb8bd89a2d91cd064ac23c587947830adf847fa7799884a02f4a\",\"content_sha256\":\"c9b2b14ef60b40f81809167eacbd4aaad59c1a9a1e1264cb821ce95ea6f80569\",\"file_bytes\":1463,\"body_bytes\":263},{\"atom_id\":\"state-the-kind-of-a-relationship-in-the-prose-not-in-the-link\",\"file_sha256\":\"a4e688a8fcca7dbf20a1abda476e488fe43aa190bec887f6e0316d58a061bedc\",\"content_sha256\":\"1ac68820d35f30e5b0f6dfb211fd15db157d50d6250bc73df750d34c73b3b9f0\",\"file_bytes\":1505,\"body_bytes\":363},{\"atom_id\":\"supply-only-the-parameter-values-never-the-computation\",\"file_sha256\":\"4d58c1756716f642f45a6eafa5a9f9fe5591069cd8804a4de50e0d9211d88484\",\"content_sha256\":\"50cbc94f9358552e429dba8f51b698e404b20a2424700cc502ac887904968a98\",\"file_bytes\":1901,\"body_bytes\":700},{\"atom_id\":\"surface-the-attestation-verdict-instead-of-dropping-it\",\"file_sha256\":\"1c712b26e9ad6fcc6090d3669f8795cdbabca84106c121f51a559704b8e5b6fc\",\"content_sha256\":\"fc0d41c22b7e64c6ab5ef907ec8c0a750ccad0fd151f3c5e8e6a7e72e117a5b3\",\"file_bytes\":1462,\"body_bytes\":379},{\"atom_id\":\"synthesize-the-listing-when-the-corpus-has-none\",\"file_sha256\":\"fee3d88db180650e25cdf98bed4f46b0de012672312ddd7829b42a77668be07f\",\"content_sha256\":\"9e883b67aaa32fccbee62d27be1ed78c2422e9435ce841caebcd0d597467609d\",\"file_bytes\":1542,\"body_bytes\":398},{\"atom_id\":\"synthesize-the-tag-view-at-consumption-time\",\"file_sha256\":\"941bd1dd7854ff30b80e25d3c51e0d1807d88b15977368fe4e8d3e906b774fcf\",\"content_sha256\":\"3dc43a62fd85979dfd3843d0ea7c9d7daee9604073cfe07baaa5757aefcb0f07\",\"file_bytes\":1288,\"body_bytes\":237}]"
carrier_sha256: be4a95ab0dd1d4d684221b84d1f368df00a972d7e2ba74396ae4328a06869d2b
carrier_bytes: 13535
revision: 1
status: active
---
<!-- vpmodule:atom:begin read-the-new-field-and-fall-back-to-the-old-one -->
---
instruction_id: read-the-new-field-and-fall-back-to-the-old-one
title: Read the new field and fall back to the old one
summary: "When a field is superseded, the consumer reads the new field and falls back to the legacy one while documents of the old form still exist."
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer reads documents in which a field has been superseded.
conditions_does_not_apply_when: No document of the old form exists any more.
artifact_contract_output_type: version-tolerant-read
artifact_contract_required_data:
  - the new field
  - the legacy fallback
  - the documents that used the legacy form
artifact_contract_verified_by: the new field is read first and the legacy field is read only when the new one is absent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read the new field and fall back to the old one
Consumers MAY fall back to a legacy `timestamp` when `generated` is absent.
Consumers SHOULD read `sources` and MAY still parse a legacy `# Citations` body list for v0.1 documents.
<!-- vpmodule:atom:end read-the-new-field-and-fall-back-to-the-old-one -->
<!-- vpmodule:atom:begin record-the-sources-a-concept-was-derived-from -->
---
instruction_id: record-the-sources-a-concept-was-derived-from
title: Record the sources a concept was derived from
summary: "The material a concept derives from is recorded in a sources list: every entry names the resource it comes from, and every source the body cites carries a stable key."
capability_tags:
  - research-primary-sources
pattern_tags:
  - provenance-record
conditions_applies_when: A concept is written from material that exists outside the document.
conditions_does_not_apply_when: The concept states nothing that was derived from an outside material.
artifact_contract_output_type: source-list
artifact_contract_required_data:
  - the sources
  - the resource of each source
  - the key of each cited source
artifact_contract_verified_by: every source names its resource and every cited source carries a key
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Record the sources a concept was derived from
`sources` records the materials a concept derives from, external or internal to the bundle.
`resource`: REQUIRED within an entry.
Names either a concrete artifact a consumer can follow (an absolute URL, a bundle-relative path, or a path into a `references/` subdirectory) or a population or scope descriptor it cannot.
A stable key used to attribute individual claims (see below).
SHOULD be present when the body cites the source.
`title`: Optional. Human-readable label for the source.
Lineage is expressed through links, not a dedicated field.
<!-- vpmodule:atom:end record-the-sources-a-concept-was-derived-from -->
<!-- vpmodule:atom:begin require-a-type-on-every-concept-document -->
---
instruction_id: require-a-type-on-every-concept-document
title: Require a type on every concept document
summary: "Every document of a knowledge corpus carries a non-empty type that says what kind of concept it is; the type values are not registered centrally, so the type describes the concept rather than identifying it in a registry."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - output-formatting
conditions_applies_when: A document of a knowledge corpus is written or checked.
conditions_does_not_apply_when: "The document is an index or a log file, which carry no concept metadata."
artifact_contract_output_type: concept-document
artifact_contract_required_data:
  - the type of the document
  - the documents that carry no type
artifact_contract_verified_by: every document carries a non-empty type and every type value is descriptive
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Require a type on every concept document
Every frontmatter block contains a non-empty `type` field.
`type`: A short string identifying the kind of concept.
Consumers use it for routing, filtering, and presentation.
Type values are **not** registered centrally.
<!-- vpmodule:atom:end require-a-type-on-every-concept-document -->
<!-- vpmodule:atom:begin state-the-kind-of-a-relationship-in-the-prose-not-in-the-link -->
---
instruction_id: state-the-kind-of-a-relationship-in-the-prose-not-in-the-link
title: "State the kind of a relationship in the prose, not in the link"
summary: "A link says that two documents are related; which relation it is comes from the prose around the link, not from the link itself."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - cross-reference-linking
conditions_applies_when: A link between two documents is written.
conditions_does_not_apply_when: The relation is already carried by the place of the document in the hierarchy.
artifact_contract_output_type: described-relationship
artifact_contract_required_data:
  - the link
  - the prose that names the kind of relation
artifact_contract_verified_by: the kind of relation is stated in the prose and not encoded in the link
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# State the kind of a relationship in the prose, not in the link
A link from concept A to concept B asserts a *relationship*.
The specific kind (parent/child, references, joins-with, depends-on) is conveyed by the surrounding prose, not by the link itself.
Consumers that build a graph view typically treat all links as directed edges of an untyped relationship.
<!-- vpmodule:atom:end state-the-kind-of-a-relationship-in-the-prose-not-in-the-link -->
<!-- vpmodule:atom:begin supply-only-the-parameter-values-never-the-computation -->
---
instruction_id: supply-only-the-parameter-values-never-the-computation
title: "Supply only the parameter values, never the computation"
summary: The agent fills in the values of the declared parameters and never writes the computation; the attester rebuilds the same binding and compares it with what actually ran.
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A sanctioned computation is about to be run with supplied values.
conditions_does_not_apply_when: The computation is being written for the first time.
artifact_contract_output_type: parameter-binding
artifact_contract_required_data:
  - the declared parameters
  - the values supplied
  - the binding the attester re-derived
artifact_contract_verified_by: only values were supplied and the re-derived binding matches the receipt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Supply only the parameter values, never the computation
The agent MAY only supply *values* for the declared `parameters`; it MUST NOT author or edit the computation.
Binding `computation` with the parameter values into the executable artifact is the consumer's job, and the attester independently re-derives that same binding to compare against what actually ran.
Because the comparison is on the expanded, compiled artifact the receipt carries (`executed_sql`, `compiled_sql`), a rewritten query, a swapped computation file, or a mutated dependency fails the check.
A typed, parameter-only surface is what makes "did the sanctioned thing run" a mechanical comparison rather than a judgement call.
<!-- vpmodule:atom:end supply-only-the-parameter-values-never-the-computation -->
<!-- vpmodule:atom:begin surface-the-attestation-verdict-instead-of-dropping-it -->
---
instruction_id: surface-the-attestation-verdict-instead-of-dropping-it
title: Surface the attestation verdict instead of dropping it
summary: "A failing attestation is surfaced and never silently dropped, and a successful verdict is shown so that the trust in the value is visible."
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A run has been attested and the result is about to be shown.
conditions_does_not_apply_when: Nothing was attested.
artifact_contract_output_type: attestation-verdict
artifact_contract_required_data:
  - the verdict
  - where the verdict is surfaced
artifact_contract_verified_by: a failing verdict was surfaced and a passing verdict was shown
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Surface the attestation verdict instead of dropping it
- SHOULD derive trust tiers and staleness only from the fields specified here, and SHOULD surface, not silently drop, a failing attestation (§10.5).
Refuse to display a failing attestation; warn or refuse when `now >= stale_after`.
On success, surface the verdict (for example a link to the job log) so trust is visible.
<!-- vpmodule:atom:end surface-the-attestation-verdict-instead-of-dropping-it -->
<!-- vpmodule:atom:begin synthesize-the-listing-when-the-corpus-has-none -->
---
instruction_id: synthesize-the-listing-when-the-corpus-has-none
title: Synthesize the listing when the corpus has none
summary: "A directory listing lets a reader see what is available before opening a document; when the corpus has no listing, the consumer can build one while it reads."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A consumer has to find what a corpus holds before it opens the documents.
conditions_does_not_apply_when: The corpus holds a single document.
artifact_contract_output_type: directory-listing
artifact_contract_required_data:
  - the documents of the directory
  - the description of each entry
artifact_contract_verified_by: the listing names every document of the directory and carries its description
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Synthesize the listing when the corpus has none
An `index.md` file MAY appear in any directory, including the bundle root.
It enumerates the directory's contents to support **progressive disclosure**: letting a human or agent see what is available before opening individual documents.
Producers MAY generate `index.md` automatically; consumers MAY synthesize one on the fly when none is present.
<!-- vpmodule:atom:end synthesize-the-listing-when-the-corpus-has-none -->
<!-- vpmodule:atom:begin synthesize-the-tag-view-at-consumption-time -->
---
instruction_id: synthesize-the-tag-view-at-consumption-time
title: Synthesize the tag view at consumption time
summary: "Tags stay in the frontmatter of each document; a consumer that wants a tag-browsing view builds it while reading, not from a separate tag file."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A consumer wants to browse a corpus by tag.
conditions_does_not_apply_when: The corpus carries no tags.
artifact_contract_output_type: tag-view
artifact_contract_required_data:
  - the tags of each document
  - the view built from them
artifact_contract_verified_by: the view was synthesized from the frontmatter and no separate tag file is kept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Synthesize the tag view at consumption time
The format does not specify a separate file format for aggregating documents by tag; a consumer that wants a tag-browsing view can synthesize one at consumption time by scanning frontmatter.
<!-- vpmodule:atom:end synthesize-the-tag-view-at-consumption-time -->