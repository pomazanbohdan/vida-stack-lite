---
instruction_id: enumerate-the-facts-before-you-replace-the-probes
title: Enumerate the facts before you replace the probes
summary: "Every fact the old probes established is written down first; only the facts the new contract covers move, and the rest keep their probe."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A set of probes is being replaced by value assertions.
conditions_does_not_apply_when: Nothing is being replaced.
artifact_contract_output_type: migration-note
artifact_contract_required_data:
  - the list of facts the probes established
  - the reason each fact stays a probe or becomes an assertion
artifact_contract_verified_by: every former fact is accounted for and the assertion surface did not shrink silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/migrate-an-install-test-to-the-executed-plan.md
status: active
revision: 1
---

# Enumerate the facts before you replace the probes
Before converting a probing group, list every fact its existing `fs.existsSync`/`fs.readFileSync` calls establish. Convert only the facts the plan's per-kind contract actually covers. A migration that asserts *less* than the probes it replaces looks like a simplification and is a regression — a shrinking assertion surface with no visible signal that coverage was dropped.
Before converting a group of your own, write down that same enumeration — what each existing probe proves — and mark each fact "covered by `plan.kinds`" or "stays a probe, because …". If you cannot state the "because", the fact likely belongs on the value-assertion side; if you can, keep the probe. Do not delete a probe just because it is adjacent to one that migrated cleanly.
