---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-common-mistakes
title: Avoid common usability mistakes
summary: "Fix unlabeled icons, excessive choices, poor orientation, late validation, unclear optional fields, dense text, vague labels, missing loading, small touch targets, hover-only information, missing undo, unexplained errors, low contrast, shifting navigation and broken history."
capability_tags:
  - audit-accessibility
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing an interface for the listed usability mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the concrete correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L167-L188"
status: active
revision: 1
---

# Avoid common usability mistakes

Remedy the listed mistakes: label icons; reduce choices (about 7 +/- 2); orient users; validate on blur with specific messages; mark optional fields; break up dense text; use plain labels; show loading; use touch targets at least 44x44 px; expose hover-only information to mobile/keyboard users; provide undo for non-destructive actions; explain errors; meet WCAG AA 4.5:1 contrast; keep navigation position consistent; preserve browser history.
