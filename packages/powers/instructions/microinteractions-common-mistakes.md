---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-common-mistakes
title: Avoid the common microinteraction mistakes
summary: "Check the eight recurring failures: no feedback, overdesign, ignored edge cases, invisible triggers, mode errors, ignored long loops, feedback overload and fake progress; apply the stated fix for each."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a microinteraction for the listed failure patterns.
conditions_does_not_apply_when: A finding already covered by a narrower instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L176-L188"
status: active
revision: 1
---

# Avoid the common microinteraction mistakes

Avoid these microinteraction mistakes and apply their fixes: no feedback on action, because users cannot tell whether a tap registered, is fixed by adding an immediate visual state change to every interactive element; overdesigning simple moments, because complex animations slow frequent actions, is fixed by reserving rich animation for infrequent, high-impact moments; ignoring edge cases, which breaks at zero, maximum, or double-tap, is fixed by mapping every state: empty, loading, partial, full, error, and disabled; invisible triggers, which prevent discovery, are fixed by pairing gesture triggers with a visible alternative; mode errors, where the same action gives different results based on hidden state, are fixed by making the current mode visible and minimizing modes; ignoring long loops, which makes the interaction feel identical on day 1 and day 100, is fixed by using progressive reduction for returning users; feedback overload, where every action triggers a toast, sound, or animation, is fixed by using the smallest feedback that communicates; and fake progress indicators, which deceive users when they discover the bar is fake, are fixed by using honest, deterministic progress or an indeterminate spinner when the outcome is unknown.
