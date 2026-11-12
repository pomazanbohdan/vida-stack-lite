---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-src-reference-agent-prompts-reference-instruction-md-e1f3e26b-c01"
title: "open-knowledge-format: src/reference_agent/prompts/reference_instruction.md module"
summary: "Carrier for 8 atomic instructions from open-knowledge-format:src/reference_agent/prompts/reference_instruction.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"src/reference_agent/prompts/reference_instruction.md\"}"
atom_ids:
  - augment-the-document-and-keep-every-heading
  - bind-a-claim-to-a-source-with-a-matching-label
  - describe-the-concept-by-its-grain-range-and-caveats
  - do-not-invent-the-structure-the-source-does-not-state
  - keep-the-provenance-in-the-record-not-in-a-body-section
  - link-only-to-targets-you-have-seen
  - make-every-file-reference-clickable
  - record-only-the-sources-you-actually-read
atom_count: 8
atoms: "[{\"atom_id\":\"augment-the-document-and-keep-every-heading\",\"file_sha256\":\"9cce0ea05e3fef0462e397b9acc017196d24adf0154336195a2be3b428e6badc\",\"content_sha256\":\"8570526fa432487139c2ed37d9b2535cb509501398a31cb097c2b53d3e64a2d0\",\"file_bytes\":2646,\"body_bytes\":1209},{\"atom_id\":\"bind-a-claim-to-a-source-with-a-matching-label\",\"file_sha256\":\"36c8e4989bcfb13907bf5124bdabf198235de3abf6eecdcc08d19888d5d5c2ce\",\"content_sha256\":\"227bf29a8177b7846e3119e1506394778acaeeaec5c57bcd48245ccfeee31cf1\",\"file_bytes\":1596,\"body_bytes\":415},{\"atom_id\":\"describe-the-concept-by-its-grain-range-and-caveats\",\"file_sha256\":\"035da31fffb027f4686e99df4b1dbd2055b031d9b866b3db5de75bf0f43883ce\",\"content_sha256\":\"4206bb26565fc254b0d7b3854a0c6b554d3bbddfff3d174f03518191172c0531\",\"file_bytes\":1454,\"body_bytes\":288},{\"atom_id\":\"do-not-invent-the-structure-the-source-does-not-state\",\"file_sha256\":\"793c6a40b44a182cab9e6204d0773fc4dc0334c99e8661692b12e8983d466b5a\",\"content_sha256\":\"80d53da5bb749fe15cd29c05289c97976bb78fe001cb8b3f3dc5fdebf5572afc\",\"file_bytes\":1558,\"body_bytes\":233},{\"atom_id\":\"keep-the-provenance-in-the-record-not-in-a-body-section\",\"file_sha256\":\"3de88b5b7deb31721df38b093551932bb8b543a366c9d216ea93ca86f42adbf3\",\"content_sha256\":\"2afc1dd0f3aaeb0beadbff1ce67d88440601523848040e5412c454c1e13b7d5d\",\"file_bytes\":1800,\"body_bytes\":490},{\"atom_id\":\"link-only-to-targets-you-have-seen\",\"file_sha256\":\"3ac6ab99cf20a40b1cd489b7fcb50010773e54993f4ef1cfc79eb1e0f3d715ba\",\"content_sha256\":\"9696734926c14fc21c3438773086c2c4329e031d52cc98d1776db53f2609daa7\",\"file_bytes\":1493,\"body_bytes\":299},{\"atom_id\":\"make-every-file-reference-clickable\",\"file_sha256\":\"ad49c0f360380aac9be9b9aabef27cace16b853e287ff01e51756cd0ec7c2c09\",\"content_sha256\":\"b09fcdcd09664d7c2efb090401c61b04e1d03af25304f6f089e780f9b1c7c766\",\"file_bytes\":1817,\"body_bytes\":502},{\"atom_id\":\"record-only-the-sources-you-actually-read\",\"file_sha256\":\"2d4f05a2c1cedba2d777d56a3bbcc3f2d4d6fde56024846afa067a29abee32a1\",\"content_sha256\":\"fb1c52ee10fc43bafc733d0d4687344eb2c51504b49de6b7602d29b9d1961f0b\",\"file_bytes\":1529,\"body_bytes\":214}]"
carrier_sha256: 0be5090d0b23d018795dfe7efc246a318c06ad54bcc9b4b639a51260de6aa167
carrier_bytes: 15072
revision: 1
status: active
---
<!-- vpmodule:atom:begin augment-the-document-and-keep-every-heading -->
---
instruction_id: augment-the-document-and-keep-every-heading
title: Augment the document and keep every heading
summary: "The document that is already on disk is the source of truth: every heading it has stays, in the same order and with the same wording, and the new material is added on top of it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - expand-contract
conditions_applies_when: A document that already exists on disk is written again with new material.
conditions_does_not_apply_when: The document is written for the first time.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the headings of the existing document
  - the headings of the new document
  - the content that was added
artifact_contract_verified_by: every heading of the existing document appears in the new document in the same order and with the same wording
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Augment the document and keep every heading
If it does, use it as a starting point and refine rather than rewrite.
Augmentation is strict (see "Augmentation rules" below) — you must preserve the existing structure verbatim and add content within or alongside it.
the call is an *augmentation*, not a rewrite.
Treat the existing doc as the source of truth and fold the web page into it.
Body — every `#` heading in the existing body must appear in your new body, in the same order, with the same wording.
You may:
- extend the prose under each heading,
- add new bullets to existing lists (e.g. add fields to `# Schema`, not replace the list),
- add new sub-sections (`##`) under existing top-level headings,
- add brand-new top-level headings **after** the existing ones,
You may not:
- drop or rename any existing `#` heading,
- replace the body wholesale with a topical rewrite of the web page,
If you cannot honor rule 2 because the web page is a fundamentally different topic (a query cookbook, a release notes page, a generic tutorial), do not call `write_concept_doc` for the existing concept.
Either mint a `references/<slug>` doc and cross-link from the primary doc’s prose, or skip the page.
<!-- vpmodule:atom:end augment-the-document-and-keep-every-heading -->
<!-- vpmodule:atom:begin bind-a-claim-to-a-source-with-a-matching-label -->
---
instruction_id: bind-a-claim-to-a-source-with-a-matching-label
title: Bind a claim to a source with a matching label
summary: "A claim that rests on a source is marked with a footnote whose label is the id of that source entry, so the claim and its evidence are found together."
capability_tags:
  - define-output-format
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A claim in the body rests on a named source.
conditions_does_not_apply_when: The body carries no claim that rests on a source.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the claim
  - the footnote label
  - the id of the source entry it names
artifact_contract_verified_by: the label of the footnote on the claim is the id of a source entry and the footnote is defined in the body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Bind a claim to a source with a matching label
Each entry is a mapping with a required `resource` (the URI), a stable `id` key, and a human-readable `title`.
To attribute a specific claim in the body, end the sentence with a markdown footnote whose label matches a `sources[].id` (e.g. a sentence ending in `[^export-docs]`, with a matching `[^export-docs]: Export schema` footnote definition later in the body).
<!-- vpmodule:atom:end bind-a-claim-to-a-source-with-a-matching-label -->
<!-- vpmodule:atom:begin describe-the-concept-by-its-grain-range-and-caveats -->
---
instruction_id: describe-the-concept-by-its-grain-range-and-caveats
title: "Describe the concept by its grain, its range and its caveats"
summary: "A concept is described by what one row is, over which time range it holds and what was obfuscated or sampled; a description without those is not yet a description of the thing."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A concept is described in prose.
conditions_does_not_apply_when: The concept is a definition that has no rows and no range.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the grain
  - the time range
  - the obfuscation or sampling caveats
artifact_contract_verified_by: "the prose names the grain, the time range and the caveats"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Describe the concept by its grain, its range and its caveats
A short prose description (1–3 paragraphs) of what this concept is, what it represents, and how it is typically used.
For tables, describe the grain (one row per X), the time range, and any obfuscation or sampling caveats.
<!-- vpmodule:atom:end describe-the-concept-by-its-grain-range-and-caveats -->
<!-- vpmodule:atom:begin do-not-invent-the-structure-the-source-does-not-state -->
---
instruction_id: do-not-invent-the-structure-the-source-does-not-state
title: Do not invent the structure the source does not state
summary: "Fields, partitions and joins are written only when the source states them; what the source does not say is left out instead of being made up."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: A document describes the structure of a source.
conditions_does_not_apply_when: The structure is read directly from the source.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the fields and partitions the source states
  - the joins the source names
artifact_contract_verified_by: "every field, partition and join in the document is stated by the source"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Do not invent the structure the source does not state
Do not invent fields, partitions, or shard counts that are not in the raw metadata.
Only capture joins explicitly named in documentation or example queries on the fetched page.
<!-- vpmodule:atom:end do-not-invent-the-structure-the-source-does-not-state -->
<!-- vpmodule:atom:begin keep-the-provenance-in-the-record-not-in-a-body-section -->
---
instruction_id: keep-the-provenance-in-the-record-not-in-a-body-section
title: "Keep the provenance in the record, not in a body section"
summary: The provenance of a document lives in the record that carries it; the body does not repeat it in a section of its own.
capability_tags:
  - define-output-format
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A document states where its content comes from.
conditions_does_not_apply_when: The document carries no sources at all.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the source entries in the record
  - the absence of a provenance section in the body
artifact_contract_verified_by: the sources are in the record and the body holds no provenance section of its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Keep the provenance in the record, not in a body section
Do **not** add a `# Citations` section; provenance now lives in the `sources` frontmatter (see below).
Provenance lives here, **not** in a `# Citations` body section.
Record provenance in the `sources` frontmatter list (each entry `{id, resource, title}`), never in a `# Citations` body section.
Include this concept’s own `resource` value as a `sources` entry (when present), followed by any URLs that informed the description.
<!-- vpmodule:atom:end keep-the-provenance-in-the-record-not-in-a-body-section -->
<!-- vpmodule:atom:begin link-only-to-targets-you-have-seen -->
---
instruction_id: link-only-to-targets-you-have-seen
title: Link only to targets you have seen
summary: "A link names a target the set actually holds; an invented target, a link to the document itself and a link in a heading, a code block or a field listing are all left out."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document links to other documents of the same set.
conditions_does_not_apply_when: The text carries no link.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the links that were written
  - the list of targets that exists
artifact_contract_verified_by: "every link names a target from the list, no link sits in a heading, a code block or a field listing, and no concept is linked more than once per section"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Link only to targets you have seen
Only link to ids returned by `list_concepts()`.
Do not invent link targets.
One link per concept mention per section is enough.
Do not over-link.
Do not link from headers, fenced code blocks, or schema field-name listings.
Do not link the current doc to itself.
<!-- vpmodule:atom:end link-only-to-targets-you-have-seen -->
<!-- vpmodule:atom:begin make-every-file-reference-clickable -->
---
instruction_id: make-every-file-reference-clickable
title: Make every file reference clickable
summary: "A file reference in human-facing output is never plain text: it is a link in the file and a host-clickable form in the session."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: "A file path or a file:line reference is written into human-facing output."
conditions_does_not_apply_when: "The reference is written for a machine that reads paths, not for a human reader."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the reference form used in the narrative file
  - the reference form used in the session
artifact_contract_verified_by: "no file and no file:line appears as plain text in human-facing output"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make every file reference clickable
Never write a file or `file:line` reference in human-facing output as plain text.
In the review narrative file, every file and `file:line` must be a markdown link relative to that file (`[label](../src/foo.ts)`).
In the session, never write a markdown link. Use a form the host can click: a Cursor code citation (`startLine:endLine:path` on the opening fence); a VS Code `#file:path`; or a CWD-relative `path:line` with no leading `/`. If unsure, use `path:line`.
<!-- vpmodule:atom:end make-every-file-reference-clickable -->
<!-- vpmodule:atom:begin record-only-the-sources-you-actually-read -->
---
instruction_id: record-only-the-sources-you-actually-read
title: Record only the sources you actually read
summary: Only the material that was really fetched is listed as a source; a URL that was never opened is never written down.
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: A document lists the sources it was written from.
conditions_does_not_apply_when: Every source in the list is already in the document that is being refined.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the sources that were fetched
  - the sources that were already in the document
artifact_contract_verified_by: no source in the list was neither fetched nor already present in the document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Record only the sources you actually read
Record in `sources` **only** URLs you actually fetched (or URLs already present in the doc you’re refining).
Do not invent URLs; record only sources you actually know.
<!-- vpmodule:atom:end record-only-the-sources-you-actually-read -->