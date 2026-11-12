---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-capabilities-mempalace-fragments-recall-discuss-md-ca054fce-c01"
title: "gsd-core: capabilities/mempalace/fragments/recall-discuss.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:capabilities/mempalace/fragments/recall-discuss.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"capabilities/mempalace/fragments/recall-discuss.md\"}"
atom_ids:
  - fold-the-relevant-memory-into-the-discussion-with-its-provenance
  - surface-what-you-already-know-before-you-gather-new-context
atom_count: 2
atoms: "[{\"atom_id\":\"fold-the-relevant-memory-into-the-discussion-with-its-provenance\",\"file_sha256\":\"2ca1f38d21048aa9a36b380b33091dda49ddc16303df9bd0e159d874c1a209b5\",\"content_sha256\":\"ea1aa33d1dd985f779da66b6efd578d74d27000b7389452b0b86079baf707757\",\"file_bytes\":1426,\"body_bytes\":264},{\"atom_id\":\"surface-what-you-already-know-before-you-gather-new-context\",\"file_sha256\":\"38dba5e333f6f7af03b854dafebf81e17f905a77d689f28b8979f5b478818fa7\",\"content_sha256\":\"dc2332f21fca7223195dfa0781ef2dcb02f05b9e5fdcdfa70ebed532867e1789\",\"file_bytes\":1543,\"body_bytes\":374}]"
carrier_sha256: b66df00b00c8314724cc84760e9abad7dedae793f68c55a1f6ff46b8d25bcf2b
carrier_bytes: 3330
revision: 1
status: active
---
<!-- vpmodule:atom:begin fold-the-relevant-memory-into-the-discussion-with-its-provenance -->
---
instruction_id: fold-the-relevant-memory-into-the-discussion-with-its-provenance
title: Fold the relevant memory into the discussion with its provenance
summary: Recalled items are folded into the work as prior context with their source named; the raw search output is not pasted in.
capability_tags:
  - communicate-concisely
pattern_tags:
  - progressive-disclosure
conditions_applies_when: Recalled material is being brought into a discussion or a decision.
conditions_does_not_apply_when: Recalled material is not used in the current work.
artifact_contract_output_type: recalled-context
artifact_contract_required_data:
  - the folded items
  - the provenance of each
  - what is not pasted
artifact_contract_verified_by: the relevant items are in the work with their source and the raw output is absent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/mempalace/fragments/recall-discuss.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Fold the relevant memory into the discussion with its provenance
- **Surface, don't dump.** Fold the top relevant drawers, decisions, patterns, and *surprises* into the discussion as prior context — cite drawer/fact provenance. Do not paste raw search output.
<!-- vpmodule:atom:end fold-the-relevant-memory-into-the-discussion-with-its-provenance -->
<!-- vpmodule:atom:begin surface-what-you-already-know-before-you-gather-new-context -->
---
instruction_id: surface-what-you-already-know-before-you-gather-new-context
title: Surface what you already know before you gather new context
summary: "Before new context is gathered, what is already stored about the topic is brought up, and the gathering is skipped when the store cannot answer."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A discussion or investigation is about to gather new material.
conditions_does_not_apply_when: There is nothing stored about the topic.
artifact_contract_output_type: recall-first
artifact_contract_required_data:
  - what was recalled
  - the topic it was recalled for
  - what happened when the store was unreachable
artifact_contract_verified_by: the prior knowledge was surfaced before anything new was gathered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/mempalace/fragments/recall-discuss.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Surface what you already know before you gather new context
- Otherwise — before gathering new context, surface what you already know. This is read-only and side-effect-free; if MemPalace is unreachable, note "memory unavailable" and continue — recall never blocks discussion.
- In every mode an unreachable palace falls back to native memory — recall never blocks.
<!-- vpmodule:atom:end surface-what-you-already-know-before-you-gather-new-context -->