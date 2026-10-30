---
instruction_id: write-every-intermediate-to-disk
title: Write every intermediate to disk
summary: "Every intermediate lands in a file the moment it exists, and the scratch state that supports a resume is written after each finished unit and removed once the canonical record is written."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: A run produces material that a later step or a later session needs.
conditions_does_not_apply_when: The work is one short action with nothing to resume.
artifact_contract_output_type: persisted-artifact-set
artifact_contract_required_data:
  - the artifact written to disk
  - the moment it was written
artifact_contract_verified_by: every intermediate result exists as a file before the next step reads it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/default.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write every intermediate to disk
**Nothing exists until it is a file.**
Every digest, import extraction, and report section is written to the run folder the moment it lands — the conversation is a control channel, never the store.
A run that dies mid-flight resumes from disk with nothing lost.
immediately write a checkpoint file with all decisions captured so far.
This prevents data loss if the session is interrupted mid-discussion.
The checkpoint is structured state, not the canonical
Clean up checkpoint file
is now the canonical record
On session resume,
detects the checkpoint and offers to resume.
