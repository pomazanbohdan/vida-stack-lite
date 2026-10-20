---
instruction_id: keep-the-cast-alive-until-the-session-ends
title: Keep the cast alive until the session ends
summary: "A participant that finished the task it was given is idle, not done; release it only when the session ends."
capability_tags:
  - coordinate-program
pattern_tags:
  - standing-cast
conditions_applies_when: Long-lived participants are kept for a whole session and the first request has already been answered.
conditions_does_not_apply_when: The work is a single bounded dispatch that ends with its answer.
artifact_contract_output_type: standing-cast-state
artifact_contract_required_data:
  - the live participants
  - the idle ones
  - the release point
artifact_contract_verified_by: no participant was closed because the first request was served
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/mode-subagent.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/SKILL.md
status: active
revision: 1
---

# Keep the cast alive until the session ends
A member that finished the one thing you handed it is **idle, not done** — don't close, retire, or disband it.
Serving the opening intent doesn't end the party; only the user ending it does
Release agents only at wrap-up.
A served opening intent means *what's next?*, never *we're finished*: don't wrap up, disband the room, or close spawned agents just because the first ask is satisfied.
