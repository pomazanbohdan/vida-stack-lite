---
instruction_id: write-every-intermediate-to-disk
title: Write every intermediate to disk
summary: "Every digest, extraction and report section lands in a file the moment it exists; the conversation is a control channel, never the store."
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
status: active
revision: 1
---

# Write every intermediate to disk
**Nothing exists until it is a file.**
Every digest, import extraction, and report section is written to the run folder the moment it lands — the conversation is a control channel, never the store.
A run that dies mid-flight resumes from disk with nothing lost.
