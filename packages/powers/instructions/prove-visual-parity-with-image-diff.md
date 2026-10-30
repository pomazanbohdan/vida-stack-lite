---
instruction_id: prove-visual-parity-with-image-diff
title: Prove visual parity with image diff
summary: "Make the baseline the spec: screenshot before the migration, compare each component by image diff, and treat a nonzero diff as a failure."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The change affects how the interface looks and must preserve or deliberately change the visual state.
conditions_does_not_apply_when: The change does not touch the visual presentation.
artifact_contract_output_type: image-diff
artifact_contract_required_data:
  - baseline
  - new screenshot
  - diff map
  - explanation of differences
artifact_contract_verified_by: pixel comparison at a fixed viewport and pixel density
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/visual-parity.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Prove visual parity with image diff
You own pixel-exact equivalence; the baseline is the spec.
Equivalence is verified by image diff, not by eye.
Establish the baseline first, before any migration: a visual regression harness that screenshots the current component across its states, plus the target when matching two implementations.
No baseline, no parity claim.
A blocking prerequisite, not a follow-up.
Hold these anti-shortcut clauses: no harness modifications, no baseline tampering, no component restructuring to make a diff pass.
If the baseline looks wrong, stop and ask; do not edit it.
Migrate one component at a time.
Parallelize across worktrees, one owner per component.
Shared primitives migrate first as a blocking phase.
Verify each component against its baseline by image diff on the matching surface.
A nonzero diff is a fail.
Investigate the pixel delta.
Loop per component until the diff is zero.
Compare at a fixed viewport and pixel density.
Report the components migrated, the diff result for each, the baseline harness location, and what is left.
