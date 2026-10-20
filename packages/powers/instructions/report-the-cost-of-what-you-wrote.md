---
instruction_id: report-the-cost-of-what-you-wrote
title: Report the cost of what you wrote
summary: "The user is told what the entry costs per load, what the description costs on every session, and what could move into a reference."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
  - progressive-disclosure
conditions_applies_when: A written artefact is handed over.
conditions_does_not_apply_when: Nothing was written.
artifact_contract_output_type: cost-report
artifact_contract_required_data:
  - the cost of the entry per load
  - the length of the description
  - what could move to a reference
artifact_contract_verified_by: the report names the cost per load and what could move out of the entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ship.md
status: active
revision: 1
---

# Report the cost of what you wrote
Tell the user what `SKILL.md` costs per load and how long the description is; the description is paid on every session whether the skill fires or not. Over about 800 tokens in a plain skill's `SKILL.md`, or 1,200 in an agent's, name what could move to a reference; the measure is what a run loads, not the skill's total. A description past its two parts, or with a phrase that is not an anchor, names what to cut.
