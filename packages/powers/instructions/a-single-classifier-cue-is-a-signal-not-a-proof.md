---
instruction_id: a-single-classifier-cue-is-a-signal-not-a-proof
title: "A single classifier cue is a signal, not a proof"
summary: "When a heuristic matched one cue, the detected kinds are shown and the person is asked whether a real kind was missed; the heuristic alone never decides the coverage."
capability_tags:
  - harden-validation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A heuristic classifier matched an entry and the match may be incomplete.
conditions_does_not_apply_when: The classifier is exhaustive by construction.
artifact_contract_output_type: coverage-confirmation
artifact_contract_required_data:
  - the detected kinds
  - the kinds the person added
  - the union that was re-run
artifact_contract_verified_by: the detected kinds were shown and the person confirmed whether something was missed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-phase.md
status: active
revision: 1
---

# A single classifier cue is a signal, not a proof
The prose classifier is heuristic and LOSSY: a surface that is genuinely both a form and a list, but whose prose trips only the form cue, under-covers — and because SOMETHING classified, no `unclassified` signal fires.
So SURFACE the detected kinds to the user (AskUserQuestion) and ask whether any real element kind was missed.
If the user ADDS a kind, re-run that element with an authored `elements` override (the union of detected + added) so the missed categories are raised.
A single tripped cue is a SIGNAL, not proof the element is only that kind — the confirm step, not the heuristic, is what makes coverage sound.
