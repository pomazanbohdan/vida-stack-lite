---
instruction_id: treat-a-present-human-as-interactive
title: Treat a present human as interactive
summary: "A human in the session means interactive, whatever the payload says; when in doubt, the run is interactive."
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - safe-defaults
conditions_applies_when: A run may be interactive or unattended and the signal is ambiguous.
conditions_does_not_apply_when: An unambiguous machine signal says the run has no user.
artifact_contract_output_type: run-mode-decision
artifact_contract_required_data:
  - the signal that decided the mode
  - the mode
artifact_contract_verified_by: a human in the session was treated as interactive regardless of the payload
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-brainstorming/references/headless.md
status: active
revision: 1
---

# Treat a present human as interactive
If a human is sending messages in this session, you are interactive — no payload shape or phrasing overrides that.
Headless requires the *absence* of an interactive user.
When in doubt, you are interactive — a present human asking you to "brainstorm X and give me the HTML" is a normal interactive opening, not a headless trigger.
Facilitate them; do not brainstorm for them.
