---
instruction_id: judge-the-change-from-the-diff-since-the-baseline
title: Judge the change from the diff since the baseline
summary: "The change is judged against a staged diff of everything that changed since the captured baseline, untracked files included, not against the implementer's report."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: The code has been changed and the change has to be judged.
conditions_does_not_apply_when: Nothing was changed yet.
artifact_contract_output_type: diff-review
artifact_contract_required_data:
  - the baseline revision
  - the path of the staged diff
  - the changes the diff shows
  - the unfinished work that was completed first
artifact_contract_verified_by: the diff file was read into the context and the judgement was made against it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Judge the change from the diff since the baseline

Stage the diff and read it first: using the repository's version-control tooling, write a unified diff of all changes since `{baseline_revision}` (from `{plan_file}` frontmatter) — untracked files included — to a uniquely-named file in the system temp directory, set `{diff_file}` to its absolute path, and read that file into your own context.

Judge against the diff, not just the implementation subagent's report.

If the implementer reported anything unfinished, finish it before proceeding — and when that changes code, rewrite `{diff_file}` and re-read it.

Writing `{diff_file}` is the only change this section makes. Do NOT `git add` anything.

Acceptance criteria are judged at review, not here.
