---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-spec-md-1a7b1d4d-c04"
title: "open-knowledge-format: SPEC.md module"
summary: "Carrier for 5 atomic instructions from open-knowledge-format:SPEC.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"SPEC.md\"}"
atom_ids:
  - treat-a-broken-cross-link-as-not-yet-written-knowledge
  - treat-an-unknown-type-as-a-generic-concept
  - use-the-bundle-root-for-an-absolute-cross-link
  - write-every-timestamp-as-an-iso-8601-datetime-with-an-offset
  - write-the-change-log-newest-first-under-date-headings
atom_count: 5
atoms: "[{\"atom_id\":\"treat-a-broken-cross-link-as-not-yet-written-knowledge\",\"file_sha256\":\"2e11807d6a9bd09dffdabae17869dff0d54c126524d16a4d32d45f007ee0a903\",\"content_sha256\":\"5f5d3ecaa2eeaf984472b30d74b91f36e85b0a4770aec940bf45d0fbc7fe9b06\",\"file_bytes\":1301,\"body_bytes\":213},{\"atom_id\":\"treat-an-unknown-type-as-a-generic-concept\",\"file_sha256\":\"c73842cdbbf0bd0f88a90549619b15aceb265bb794c5f375ea233116df7d70d3\",\"content_sha256\":\"34c04e68904d0342eb0cd7fd8a66ef56affa2e95d7df2a99d6042ce673bd8be6\",\"file_bytes\":1215,\"body_bytes\":168},{\"atom_id\":\"use-the-bundle-root-for-an-absolute-cross-link\",\"file_sha256\":\"cccd5f278aa7819741ae7cb2be527e1d061932117f611eee374d6bb16c96af12\",\"content_sha256\":\"5157604da02bf35ad02cc0ec91323c964fff128ba75dc6f99d95ca6b5ea56b5c\",\"file_bytes\":1618,\"body_bytes\":513},{\"atom_id\":\"write-every-timestamp-as-an-iso-8601-datetime-with-an-offset\",\"file_sha256\":\"f41f85b7f7cd950e142f71be7283193258ab674f9421c317f07b6def88eb6114\",\"content_sha256\":\"ebb0f63d8b4fdba1aca4a4cdddd55b9c1e22709dc21e00d00f10d0bff69d1972\",\"file_bytes\":1559,\"body_bytes\":422},{\"atom_id\":\"write-the-change-log-newest-first-under-date-headings\",\"file_sha256\":\"6f6561d9abac85370295fdba925b9ed3d31a7fc193b40ddd019b27994441208a\",\"content_sha256\":\"194fa01be5967841f4c788febd96a9dce53de17c4359b5e26917f894553d6b11\",\"file_bytes\":1482,\"body_bytes\":408}]"
carrier_sha256: 5fd2ad9873df445ba56f3d3a568fb549fa2923bbe96a47cf565812188bae0580
carrier_bytes: 7974
revision: 1
status: active
---
<!-- vpmodule:atom:begin treat-a-broken-cross-link-as-not-yet-written-knowledge -->
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
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a broken cross-link as not-yet-written knowledge
Consumers MUST tolerate broken links: a link whose target does not exist in the bundle is not malformed; it may simply represent not-yet-written knowledge.
<!-- vpmodule:atom:end treat-a-broken-cross-link-as-not-yet-written-knowledge -->
<!-- vpmodule:atom:begin treat-an-unknown-type-as-a-generic-concept -->
---
instruction_id: treat-an-unknown-type-as-a-generic-concept
title: Treat an unknown type as a generic concept
summary: A consumer that meets a type it does not know handles the document as a generic concept instead of rejecting it.
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer reads a document whose type it does not recognise.
conditions_does_not_apply_when: The type is one the consumer knows.
artifact_contract_output_type: tolerated-document
artifact_contract_required_data:
  - the unknown type
  - the generic handling the document received
artifact_contract_verified_by: the unknown type was tolerated and the document was not rejected
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

# Treat an unknown type as a generic concept
Consumers MUST tolerate unknown types gracefully, typically by treating them as generic concepts.
- Unknown `type` values.
<!-- vpmodule:atom:end treat-an-unknown-type-as-a-generic-concept -->
<!-- vpmodule:atom:begin use-the-bundle-root-for-an-absolute-cross-link -->
---
instruction_id: use-the-bundle-root-for-an-absolute-cross-link
title: Use the bundle root for an absolute cross-link
summary: "A link between documents is written from the root of the corpus, so that moving a document inside its own directory does not break the link."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - cross-reference-linking
conditions_applies_when: A document links to another document of the same corpus.
conditions_does_not_apply_when: The link points at a resource outside the corpus.
artifact_contract_output_type: cross-link
artifact_contract_required_data:
  - the link as written
  - the root it is resolved against
artifact_contract_verified_by: the link starts at the root of the corpus and resolves to the document it names
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

# Use the bundle root for an absolute cross-link
Concepts MAY link to other concepts using standard markdown links.
**Absolute (bundle-relative):** begins with `/`, interpreted relative to the bundle root.
This is the **recommended** form because it is stable when documents are moved within their subdirectory.
**Relative:** a standard markdown relative path.
Use file-relative paths only. Never start a link with `/` (that breaks GitHub rendering), and don’t use bare filenames that aren’t actual siblings.
<!-- vpmodule:atom:end use-the-bundle-root-for-an-absolute-cross-link -->
<!-- vpmodule:atom:begin write-every-timestamp-as-an-iso-8601-datetime-with-an-offset -->
---
instruction_id: write-every-timestamp-as-an-iso-8601-datetime-with-an-offset
title: Write every timestamp as an ISO 8601 datetime with an offset
summary: "Every timestamp a document carries is an ISO 8601 datetime with an explicit UTC offset, so that two readers compare the same instants."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - output-formatting
conditions_applies_when: A timestamp is written into a document of a knowledge corpus.
conditions_does_not_apply_when: "The value is a plain date without a time, such as the heading of a log entry."
artifact_contract_output_type: timestamp-field
artifact_contract_required_data:
  - the timestamp
  - the UTC offset it carries
artifact_contract_verified_by: every timestamp is an ISO 8601 datetime with an explicit UTC offset
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

# Write every timestamp as an ISO 8601 datetime with an offset
Every timestamp-valued key is an ISO 8601 datetime with an explicit UTC offset, for example `2026-06-30T14:00:00Z`.
`generated.at`: An ISO 8601 datetime marking the content's last meaningful change.
Consumers use it to tell a recent edit from a stale fact.
`verified`: A list of verification events, each with `by` (an actor) and `at` (an ISO 8601 datetime).
<!-- vpmodule:atom:end write-every-timestamp-as-an-iso-8601-datetime-with-an-offset -->
<!-- vpmodule:atom:begin write-the-change-log-newest-first-under-date-headings -->
---
instruction_id: write-the-change-log-newest-first-under-date-headings
title: Write the change log newest first under date headings
summary: "The log of a directory is a flat list of date-grouped entries, newest first, under ISO date headings."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: The history of the changes to a directory is recorded.
conditions_does_not_apply_when: The history is kept in the version control system alone.
artifact_contract_output_type: change-log
artifact_contract_required_data:
  - the date headings
  - the entries under each heading
  - the order of the headings
artifact_contract_verified_by: the headings are ISO dates and the newest entry comes first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write the change log newest first under date headings
A `log.md` file MAY appear at any level of the hierarchy to record the history of changes to that scope.
Date headings MUST use ISO 8601 `YYYY-MM-DD` form.
Log entries are prose; the leading bold word (`**Update**`, `**Creation**`, `**Deprecation**`) is a convention, not a requirement.
The format is a flat list of date-grouped entries, newest first:
<!-- vpmodule:atom:end write-the-change-log-newest-first-under-date-headings -->