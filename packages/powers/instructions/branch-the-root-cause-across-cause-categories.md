---
instruction_id: branch-the-root-cause-across-cause-categories
title: Branch the root cause across cause categories
summary: "Before a root cause is committed, candidates are enumerated across at least two cause categories and the AND-gate question is answered."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A root cause is about to be committed.
conditions_does_not_apply_when: The failure has one confirmed cause and no candidate branch remains open.
artifact_contract_output_type: root-cause-branches
artifact_contract_required_data:
  - the candidate causes per category
  - the AND-gate answer
  - the confirmed set
  - the eliminated branches
artifact_contract_verified_by: the confirmed set agrees with the AND-gate answer and the eliminated branches are kept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-rca-branching.md
status: active
revision: 1
---

# Branch the root cause across cause categories
Before committing `root_cause`, enumerate candidate causes across **≥2 Ishikawa (fishbone) categories** — not a single linear chain.
code — logic error, off-by-one, wrong branch, missing null check, race in the code under investigation
config — configuration value, feature flag, schema/migration, index/capacity setting
environment — runtime version, OS/platform, timezone, network, dependencies, resource limits
data — input shape, corrupt/partial record, ordering/encoding, volume/scale
Two+ categories is the minimum bar — if every candidate lands in the same category, you have not branched; generate at least one candidate from a different category before proceeding.
Could this failure require more than one contributing condition simultaneously?
If **yes** (an AND-gate — the symptom only manifests when two or more conditions co-occur), **every contributing cause is recorded**, not just the most salient.
Append the eliminated branches to the `Eliminated` section (never delete them — Kernighan auditability).
