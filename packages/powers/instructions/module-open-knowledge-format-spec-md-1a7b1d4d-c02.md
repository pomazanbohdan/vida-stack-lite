---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-spec-md-1a7b1d4d-c02"
title: "open-knowledge-format: SPEC.md module"
summary: "Carrier for 8 atomic instructions from open-knowledge-format:SPEC.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"SPEC.md\"}"
atom_ids:
  - keep-the-author-and-the-verifier-apart
  - keep-the-contents-and-the-index-in-sync
  - keep-the-definition-check-and-the-run-check-apart
  - key-a-claim-to-the-source-id-not-to-its-position
  - mark-a-concept-with-its-lifecycle-status
  - mark-staleness-with-an-absolute-instant-not-a-relative-ttl
  - name-the-actor-by-its-kind
  - never-reject-a-document-for-a-missing-optional-field
atom_count: 8
atoms: "[{\"atom_id\":\"keep-the-author-and-the-verifier-apart\",\"file_sha256\":\"8d0cded0557d5803932c860a45b1aae08e6806d98ff948468da98e04548be3bd\",\"content_sha256\":\"980a487a39f9bffa498d5bb7c895b6649ed6511d53c7bb11eccdf616da8416f9\",\"file_bytes\":1531,\"body_bytes\":417},{\"atom_id\":\"keep-the-contents-and-the-index-in-sync\",\"file_sha256\":\"0369c5bea69f6a26f212881952069aaa404b3bb27a4bee79cfb00d352cd86d68\",\"content_sha256\":\"eb3fdac76540d23671899617df92514990467a6a5e18143852392cd6f683a30d\",\"file_bytes\":1438,\"body_bytes\":253},{\"atom_id\":\"keep-the-definition-check-and-the-run-check-apart\",\"file_sha256\":\"be712579eceb3a74a4bb7e572e78541ab53fb91ba97542244d5debd2214808ae\",\"content_sha256\":\"71c4e2c2d93c480b5c7e83e779f479ea473d8ea5eceb4c6a0a31140f5d468106\",\"file_bytes\":1655,\"body_bytes\":456},{\"atom_id\":\"key-a-claim-to-the-source-id-not-to-its-position\",\"file_sha256\":\"5a11e0537deb6d1be2981e31b7b771d961ca066cb0b0e4f24e4bcd052c0e1e10\",\"content_sha256\":\"c6d105012a3a6d0a524969534664d672c9b47421830e6854e07af0b513911df9\",\"file_bytes\":1682,\"body_bytes\":557},{\"atom_id\":\"mark-a-concept-with-its-lifecycle-status\",\"file_sha256\":\"6b860f8e0537ff331a96a90dfa8da0e39442205acb96e3f820d033830b07f5e7\",\"content_sha256\":\"9d2e287e54c47bfbf16897cd5d2c9c97518c66ab9cb9e2de114a0582f7af8a6e\",\"file_bytes\":1323,\"body_bytes\":224},{\"atom_id\":\"mark-staleness-with-an-absolute-instant-not-a-relative-ttl\",\"file_sha256\":\"0a858909ed913282a770e21af5bff1dcf41dbad4f93c0e70d5e28a3f81cb6537\",\"content_sha256\":\"a69d72e3432db00801de9a359e00bf26c70347f379d5bdc61e58f3cbe569b404\",\"file_bytes\":1456,\"body_bytes\":276},{\"atom_id\":\"name-the-actor-by-its-kind\",\"file_sha256\":\"869f47e10234a4c055a0ed50209c807e85ea4a6c22017ad439e7a525f76a6789\",\"content_sha256\":\"13e899ff35a874aeaadc02a0bf9a2845f1fb3c95f11ccce6d2864bd413aaec78\",\"file_bytes\":1775,\"body_bytes\":562},{\"atom_id\":\"never-reject-a-document-for-a-missing-optional-field\",\"file_sha256\":\"245a1318bd4c393e59aaa1cdfe140cae2fd91b343c02fa25471aa34890fb1a9b\",\"content_sha256\":\"6cd60b8c8fc7da9df890652a1aa9d2cc8b2509584f34b6f826e53cccdb97f966\",\"file_bytes\":1883,\"body_bytes\":539}]"
carrier_sha256: 062adfcc69d47dce4cf416b90520a480c3ff4d546c6d54b177d95412ea69257c
carrier_bytes: 13906
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-author-and-the-verifier-apart -->
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
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Keep the author and the verifier apart
`generated` records how the current content was produced.
`verified` records who or what has confirmed the content against its sources or `resource`.
They are kept distinct because who *wrote* a concept need not be who *confirmed* it.
`verified` is independent of `generated.at`: content can change without re-confirmation, and facts can be re-confirmed without regeneration.
<!-- vpmodule:atom:end keep-the-author-and-the-verifier-apart -->
<!-- vpmodule:atom:begin keep-the-contents-and-the-index-in-sync -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-project-context/SKILL.md
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
<!-- vpmodule:atom:end keep-the-contents-and-the-index-in-sync -->
<!-- vpmodule:atom:begin keep-the-definition-check-and-the-run-check-apart -->
---
instruction_id: keep-the-definition-check-and-the-run-check-apart
title: Keep the definition check and the run check apart
summary: "Verifying that a definition still matches the policy and attesting that one run produced the value are two different checks: the first is recorded in the corpus, the second happens on every run."
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A consumer has to decide whether a value may be shown.
conditions_does_not_apply_when: The corpus holds no definition that a policy could be checked against.
artifact_contract_output_type: check-separation
artifact_contract_required_data:
  - the definition check
  - the run check
  - where each one is recorded
artifact_contract_verified_by: the two checks are named apart and each is recorded where it belongs
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

# Keep the definition check and the run check apart
`verified` confirms the *definition* still matches policy.
It is doc-level, slow, and recorded in the bundle.
Attestation confirms a single *run* produced the value the sanctioned way.
It is per-call, runtime, and not stored in the bundle.
A concept with a stale definition can still attest cleanly, and a freshly-verified definition still requires attestation on each run, which is why both are needed.
<!-- vpmodule:atom:end keep-the-definition-check-and-the-run-check-apart -->
<!-- vpmodule:atom:begin key-a-claim-to-the-source-id-not-to-its-position -->
---
instruction_id: key-a-claim-to-the-source-id-not-to-its-position
title: "Key a claim to the source id, not to its position"
summary: "A claim is attributed through a footnote whose label is the key of the source entry, so that reordering the source list never moves an attribution."
capability_tags:
  - research-primary-sources
pattern_tags:
  - provenance-record
conditions_applies_when: A body attributes a specific claim to one of the recorded sources.
conditions_does_not_apply_when: The document carries no claim that needs a source.
artifact_contract_output_type: claim-attribution
artifact_contract_required_data:
  - the claim
  - the key of the source it is attributed to
artifact_contract_verified_by: every attributed claim names the key of its source and not a position in the list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Key a claim to the source id, not to its position
Per-claim attribution to external sources uses markdown footnotes keyed to `sources` entries rather than a body citations list (§5.1).
The footnote label is the join key into `sources`; consumers resolve attribution through the matching entry, not by parsing the footnote prose.
Labels are keyed rather than positional (`sources[0]`) because agents constantly rewrite these documents: a positional index misattributes silently the moment the list is reordered, whereas a stable `id` survives reordering.
<!-- vpmodule:atom:end key-a-claim-to-the-source-id-not-to-its-position -->
<!-- vpmodule:atom:begin mark-a-concept-with-its-lifecycle-status -->
---
instruction_id: mark-a-concept-with-its-lifecycle-status
title: Mark a concept with its lifecycle status
summary: "A concept carries a lifecycle status: not yet reviewed, ready for consumption, or kept only for links and history; a concept that carries no status is stable."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A consumer has to know whether a concept is still current.
conditions_does_not_apply_when: The concept is a single artefact that is not maintained.
artifact_contract_output_type: lifecycle-status
artifact_contract_required_data:
  - the status of the concept
  - the concepts that carry no status
artifact_contract_verified_by: every concept carries a status or is read as stable
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

# Mark a concept with its lifecycle status
`draft`: not yet reviewed; possibly incomplete.
`stable`: default; ready for consumption.
`deprecated`: kept for links and history; no longer current.
Absent `status` ⇒ `stable`.
<!-- vpmodule:atom:end mark-a-concept-with-its-lifecycle-status -->
<!-- vpmodule:atom:begin mark-staleness-with-an-absolute-instant-not-a-relative-ttl -->
---
instruction_id: mark-staleness-with-an-absolute-instant-not-a-relative-ttl
title: "Mark staleness with an absolute instant, not a relative ttl"
summary: Staleness is marked with an absolute instant; the decision is then a plain comparison that does not depend on when the document was read.
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A document has a point in time after which its content is stale.
conditions_does_not_apply_when: The document is rebuilt on every read and never goes stale.
artifact_contract_output_type: staleness-mark
artifact_contract_required_data:
  - the instant after which the content is stale
  - the comparison that decides it
artifact_contract_verified_by: the stale instant is absolute and the decision is a comparison against the current time
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

# Mark staleness with an absolute instant, not a relative ttl
Optional. An absolute instant.
A concept is stale when `now >= stale_after`.
An absolute instant, not a relative TTL, keeps the staleness decision a plain comparison with no reference to when the concept was read.
<!-- vpmodule:atom:end mark-staleness-with-an-absolute-instant-not-a-relative-ttl -->
<!-- vpmodule:atom:begin name-the-actor-by-its-kind -->
---
instruction_id: name-the-actor-by-its-kind
title: Name the actor by its kind
summary: "An identity recorded in a document is written as an agent with its version, a person, or an automated process, in one convention."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - trust-signals
conditions_applies_when: An identity is written into a field that records who or what acted.
conditions_does_not_apply_when: The field records a source or an asset rather than an actor.
artifact_contract_output_type: actor-identifier
artifact_contract_required_data:
  - the actor
  - the kind of actor
artifact_contract_verified_by: the identity follows the actor convention and a person is written with the person prefix
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the actor by its kind
**Actor**: A string identifying who or what performed an action, using the convention `<producer>/<version>` for agents, `human:<id>` for people, and `process:<id>` for automated processes (see §7).
Fields that record an identity (`generated.by`, `verified[].by`) use a single actor convention:
# Name the actor by its convention
Actors follow the convention `<producer>/<version>` for tools, `human:<id>` for people, and `process:<id>` for automated processes.
Only supply a `{by, at}` mapping yourself if you need to override it.
<!-- vpmodule:atom:end name-the-actor-by-its-kind -->
<!-- vpmodule:atom:begin never-reject-a-document-for-a-missing-optional-field -->
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
<!-- vpmodule:atom:end never-reject-a-document-for-a-missing-optional-field -->