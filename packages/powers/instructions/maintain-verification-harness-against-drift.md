---
instruction_id: maintain-verification-harness-against-drift
title: Maintain the verification harness against drift
summary: "Keep the feature map honest: cover every feature from source and exercise every feature live, so a green run never means an outdated product."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: Product behavior changed and the verification still describes the previous version.
conditions_does_not_apply_when: No verification exists yet and one has to be created from scratch.
artifact_contract_output_type: harness-update
artifact_contract_required_data:
  - updated scenarios
  - reason for the change
  - known gaps
  - run time
artifact_contract_verified_by: the updated harness executes against the current build
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/maintain-verification-skill/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/capability-matrix.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=examples/dynamic-context-management/README.md
status: active
revision: 2
---

# Maintain the verification harness against drift
A feature map rots the moment the app changes. This is the upkeep loop for a verification skill with a feature map.
The unit of rigor is the feature, not every sentence: cover every feature file from source and exercise every feature live, without turning every bullet into a task.
Pick one outcome and say which: clean, changed, or blocked.
Clean: every feature got source and live coverage, and nothing is worth shipping. No branch and no change.
Changed: one change ships proven documentation, harness, or map corrections.
Blocked: coverage could not finish, or a proven fix could not ship safely. Say exactly what blocked it.
Only edit the verification skill's own directory: its instructions, feature files, and any harness scripts it owns.
Never edit product code during a run. A behavior the map describes that the app no longer does is either documentation drift, which you fix in the map, or a product regression, which you report and do not paper over in documentation.
Locate the target first. Several candidates means ask which one; none means stop and point at the generator instead of inventing a target.
Fix missing, extra, duplicate, or dead entries in the feature map.
Run one read-only source reader per feature file, concurrently. Each explains how the feature works from source, flags likely drift with citations, and returns one concise live-verification recipe. Children never drive the app and never edit files.
Reconcile: every feature file has a returned summary. Merge overlapping recipes into as few app states as practical. Spot-check cited drift; do not re-prove clean claims.
Sweep recent churn for user-facing surfaces missing from the map, and require a concrete source path before calling one missing.
Run a live pass even when source looks clean. Exercise every feature at least once.
Never drive an instance you have not health-checked since it last did something surprising.
Keep evidence captured so far through every cleanup, checked at its named location, not assumed.
Leave nothing a drive started outliving that drive's usefulness. Clean the residue, not a shared instance.
A doctor failure caused by skill drift is drift: fix it under the edit scope and retry once before calling the pass blocked.
Triage: a wrong or missing user-facing description is documentation drift; working behavior the harness cannot drive is a harness gap; broken app behavior is a product gap, recorded for the user and kept out of this change.
For changed, re-read every changed file first, then ship one change of proven corrections. For clean or blocked, ship nothing and report the outcome and the coverage honestly.
Keep concise run notes in a scratch location and do not commit them.
- **Generated file — do not edit by hand.**
- kept honest by a drift guard (`tests/capability-matrix-sync.test.cjs` runs `--check`). Any manual edit is overwritten on the next generation run.
- `scripts/lint-example-parser-parity.cjs` (wired into `npm run lint:ci`) asserting this example and production agree.
- drift-guard a generated index
