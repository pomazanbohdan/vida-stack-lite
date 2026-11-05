---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-voice
title: "Use direct, active, timeless voice"
summary: "Address the reader as you, make the actor explicit, use present tense and timeless wording, allow passive only for unknown actors, and ban please, simply, easily, just and anthropomorphism."
capability_tags:
  - write-technical-prose
pattern_tags:
  - document-voice
conditions_applies_when: Rewriting documentation voice.
conditions_does_not_apply_when: Quoted source text that must remain verbatim.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The text uses second person, active present tense and no banned filler."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L51-L69"
status: active
revision: 1
---

# Use direct, active, timeless voice

Voice rules: address the reader as 'you'; make the actor of every sentence explicit; describe behavior in present tense; write as if read in five years. 'We' hides the actor and 'the user' turns the reader into a third party — both weaken an instruction. Passive voice allowed only when the actor is unknown or irrelevant ('The file is encrypted at rest'). 'Will' belongs only to genuinely later effects ('The server sends an ack', not 'will send'). Contractions are fine — Google prefers 'isn't' over 'is not' for negations [EN]. Software does not want, see, or think ('The API detects', not 'the API sees'). No 'please' (reserve for asking permission), no 'simply/easily/just', no superlatives — if a step is easy the reader will notice. Timeless: cut 'currently', 'new', 'soon'; never pre-announce unreleased features.
