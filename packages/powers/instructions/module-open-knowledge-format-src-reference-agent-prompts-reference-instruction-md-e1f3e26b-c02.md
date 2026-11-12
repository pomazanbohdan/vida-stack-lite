---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-src-reference-agent-prompts-reference-instruction-md-e1f3e26b-c02"
title: "open-knowledge-format: src/reference_agent/prompts/reference_instruction.md module"
summary: "Carrier for 2 atomic instructions from open-knowledge-format:src/reference_agent/prompts/reference_instruction.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"src/reference_agent/prompts/reference_instruction.md\"}"
atom_ids:
  - write-the-artifact-to-disk-and-return-only-the-confirmation
  - write-the-body-concretely-and-without-narration
atom_count: 2
atoms: "[{\"atom_id\":\"write-the-artifact-to-disk-and-return-only-the-confirmation\",\"file_sha256\":\"b7d9f9a662d7586ea30e90c182bd6e77d28d6e56e83c76afbefda08a786fd1ec\",\"content_sha256\":\"07fadcdfcdf17eb64bf4ec56a3460415f674fb8d7c110a9191f0b64cbdd0f763\",\"file_bytes\":2621,\"body_bytes\":878},{\"atom_id\":\"write-the-body-concretely-and-without-narration\",\"file_sha256\":\"5c9577068d4cd385ea16622dd146aa9fbfdcc4463f826c8e652d935f8120d14d\",\"content_sha256\":\"25dba1874802fc2c5489af13abbc6593298dd38b46abb73d00d89a602cc4e78d\",\"file_bytes\":1535,\"body_bytes\":307}]"
carrier_sha256: da11a72e0e518e8bde934eca8a480a9a93fc07558f25bfe16850247a8fb54891
carrier_bytes: 4483
revision: 1
status: active
---
<!-- vpmodule:atom:begin write-the-artifact-to-disk-and-return-only-the-confirmation -->
---
instruction_id: write-the-artifact-to-disk-and-return-only-the-confirmation
title: Write the artifact to disk and return only the confirmation
summary: "The file holds the content and the reply holds the confirmation; a failed write is reported, never worked around by returning the text."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: An agent produces a file that the next step reads from disk.
conditions_does_not_apply_when: The deliverable is the answer itself.
artifact_contract_output_type: run-status
artifact_contract_required_data:
  - the file written
  - the confirmation
artifact_contract_verified_by: "the file holds the content, the reply is a short confirmation, and a write failure was surfaced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-doc-writer.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the artifact to disk and return only the confirmation
Returns confirmation only — do not return doc content to the orchestrator.
Do NOT return the file contents in your response. Your return message is a brief confirmation; the content lives on disk.
If writing still fails, surface the actual error in your return message.
Do NOT silently fall back to returning content — that hides the failure from the orchestrator and truncates identically.
Default: write the whole file in a single `Write` call.
build the file incrementally so no single tool call carries the whole payload:
Each invocation enriches exactly **one** concept and finishes by calling `write_concept_doc` exactly once.
Do **not** print the document, the frontmatter, or the body in your reply — the only way to persist a concept is the `write_concept_doc` call.
Do not call any tools after that.
<!-- vpmodule:atom:end write-the-artifact-to-disk-and-return-only-the-confirmation -->
<!-- vpmodule:atom:begin write-the-body-concretely-and-without-narration -->
---
instruction_id: write-the-body-concretely-and-without-narration
title: Write the body concretely and without narration
summary: "The body carries the content and nothing else: no preamble, no apology and no narration of the reasoning, and every name in it is a concrete one."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The body of a document is written.
conditions_does_not_apply_when: "The text is a message to a person, not the body of a document."
artifact_contract_output_type: document-body
artifact_contract_required_data:
  - the body
artifact_contract_verified_by: "the body holds no preamble, apology or reasoning narration and names concrete fields and examples"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body prescribes general document style without grounding it in a product, design-UX, business, research, engineering, or operations task."
---

# Write the body concretely and without narration
Do not include preamble, apologies, or reasoning narration in the document body.
The body must be valid markdown that a human or downstream agent can consume directly.
Be concrete. Prefer concrete examples and concrete field names over generic hand-waving.
<!-- vpmodule:atom:end write-the-body-concretely-and-without-narration -->