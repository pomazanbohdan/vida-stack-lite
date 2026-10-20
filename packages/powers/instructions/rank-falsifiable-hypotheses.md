---
instruction_id: rank-falsifiable-hypotheses
title: Rank falsifiable hypotheses
summary: "Generate several ranked, falsifiable hypotheses before testing any of them, and show the ranked list to the user."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A reproduction is red and the cause is not yet known.
conditions_does_not_apply_when: The cause is obvious or already confirmed.
artifact_contract_output_type: ranked-hypotheses
artifact_contract_required_data:
  - ranked hypotheses
  - prediction per hypothesis
artifact_contract_verified_by: each hypothesis states the prediction its test would confirm or refute
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/diagnosing-bugs/SKILL.md
status: active
revision: 1
---

# Rank falsifiable hypotheses
Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.
Each hypothesis must be **falsifiable**: state the prediction it makes.
> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."
If you cannot state the prediction, the hypothesis is a vibe: discard or sharpen it.
**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it; proceed with your ranking if the user is AFK.
