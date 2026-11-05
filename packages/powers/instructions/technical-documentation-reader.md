---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-reader
title: Match the document type to the reader
summary: "Name one reader and one task, pick tutorial, how-to, concept, reference or README, state audience and scope, list prerequisites before step one, and end procedures with verification and next steps."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-type-fit
conditions_applies_when: Choosing or restructuring a document type.
conditions_does_not_apply_when: A mixed page with no single reader task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The document names one reader, one type, audience/scope and a verification ending."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L29-L50"
status: active
revision: 1
---

# Match the document type to the reader

Every page serves one reader with one task; name the audience and level and what the reader will be able to do afterwards before writing, and pick the document type that fits: tutorial (learn by doing), how-to (accomplish a task), concept (understand), reference (look up), README (orient and start). Per Google convention, open a doc with an audience statement and a scope plus non-scope statement; list prerequisites in a 'Before you begin' section before step 1 rather than inside a step; put key points first in the intro (what the reader gets, not product history); end every procedural page with a verification ('Confirm that...') and a 'What's next' section. A page mixing concept, procedure, and reference should be split into linked pages; a tutorial teaches one path end to end while a how-to assumes context; a README orients with what it is, who it's for, a three-step start, and links out.
