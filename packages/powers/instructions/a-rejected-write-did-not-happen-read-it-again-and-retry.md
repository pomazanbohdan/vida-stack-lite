---
instruction_id: a-rejected-write-did-not-happen-read-it-again-and-retry
title: "A rejected write did not happen, so read it again and retry"
summary: "A write that returned an error changed nothing: the previous content is read again, copied in full, and the write is made again with the new content on top."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-rerun-policy
conditions_applies_when: A write of a document was refused by a guard or returned an error.
conditions_does_not_apply_when: The write was accepted.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the error the write returned
  - the content that was read again
  - the write that was made again
artifact_contract_verified_by: the document on disk holds the previous content plus the new content and the error was not treated as a success
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A rejected write did not happen, so read it again and retry
**A rejected write did not happen — fix it and retry, do not give up.**
Do not abandon the concept and do not move on as if it succeeded.
Re-call `read_existing_doc(concept_id)`, copy the **entire** existing `# Schema` (every field) and every existing `sources` entry verbatim into your new call, add only your new content on top, and call `write_concept_doc` again.
A table schema from the metadata pass is authoritative and complete — never shrink or summarize it;
augment field descriptions inline while keeping every field.
If after re-reading you still cannot add value without dropping existing content, mint a `references/<slug>` doc instead and skip the augmentation.
