---
instruction_id: gate-the-review-fan-out-on-blast-radius
title: Gate the review fan-out on blast radius
summary: "The parallel review is skipped only when the change touches two files or fewer, stays under fifty lines and touches no auth, payments, data access or configuration; otherwise the fan-out is the default."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A pre-ship review can either fan out to specialists or run in a single pass.
conditions_does_not_apply_when: The change is production-bound and its blast radius is non-trivial.
artifact_contract_output_type: fan-out-decision
artifact_contract_required_data:
  - the files touched
  - the size of the diff
  - the sensitive areas touched
  - the decision
artifact_contract_verified_by: the fan-out was skipped only when all three conditions hold
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/ship.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/review-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the review fan-out on blast radius
5. **Skip the fan-out only if all of the following are true:** the change touches 2 files or fewer, the diff is under 50 lines, and it does not touch auth, payments, data access, or config/env. Otherwise, default to fan-out.
The fan-out
is designed for production-bound changes — when the blast radius is non-trivial, run the parallel review even if the diff looks small.
Out of the box, you get two review depths to choose from: `quick` and `thorough`.
Quick is good enough for small simple changes or throwaway prototypes.
Thorough is highly recommended for any serious work with production consequences.
a good compromise is to default to quick reviews inside the personal development cycle (selectively bumping up to `thorough` on high risk changes)
Say `thorough` or `quick` when you invoke a skill to override its default for one run.
