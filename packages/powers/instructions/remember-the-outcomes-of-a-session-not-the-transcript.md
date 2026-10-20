---
instruction_id: remember-the-outcomes-of-a-session-not-the-transcript
title: "Remember the outcomes of a session, not the transcript"
summary: "A cast of voices remembers earlier sessions as a short log of outcomes and memorable moments, not a transcript; memory is on by default for the default room, only when it is turned on for a saved party, and a shipped party starts fresh each time."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A group of voices or a session is given a memory that survives it.
conditions_does_not_apply_when: The exchange is closed and nothing has to survive it.
artifact_contract_output_type: session-memory
artifact_contract_required_data:
  - the outcomes and the memorable moments
  - the rule that no transcript is kept
  - who remembers by default and who starts fresh
artifact_contract_verified_by: what is kept is a short log of outcomes and no transcript
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/party-mode.md
status: active
revision: 1
---

# Remember the outcomes of a session, not the transcript
A party can remember earlier sessions as a short log of outcomes and memorable moments, not a transcript.
The default room remembers unless memory is turned off.
A saved party remembers only when its memory is turned on.
Shipped parties start fresh each time.
