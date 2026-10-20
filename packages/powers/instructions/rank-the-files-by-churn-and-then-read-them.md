---
instruction_id: rank-the-files-by-churn-and-then-read-them
title: Rank the files by churn and then read them
summary: "The files are ranked by measured change volume, and the top of the ranking is read before anything is called a god-class; the qualifiers say how far the ranking can be trusted."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: The size growth of the files of a body of work is judged.
conditions_does_not_apply_when: The change touched a handful of files.
artifact_contract_output_type: size-growth
artifact_contract_required_data:
  - the ranking by measured change volume
  - the real size of the files at the top
  - the qualifiers on the ranking
artifact_contract_verified_by: "no file is called a god-class on churn alone, and the unmeasured churn is reported as a qualifier"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 1
---

# Rank the files by churn and then read them
**God-class / size growth** — files that grew past a healthy size *over the epic*, invisible per-commit because each session added only a little.
The pre-pass
reports `added` / `deleted` / `net` per path in `files` — *change volume*, not a file's absolute size or a per-commit growth rate.
Those sums cover the range's **non-merge** commits only, and they are always integers: an unmeasurable revision is left out of them rather than nulling them.
Rank on `files`, then open the top of the ranking and read each file's real current size and structure before calling anything a god-class — high net churn makes a file a candidate to inspect, not a verdict on its own.
`binary_revisions` counts that path's revisions whose churn could not be measured, so its true volume is *at least* what the sums report
`merges_measured` short of `merge_count` means some merges were never measured at all, which caps how complete the ranking can be
`merge_files` mostly restates churn `files` already counted, so summing the two double counts — but it is not redundant, because a merge's first-parent diff also carries whatever the conflict resolution itself added, code that lives in no non-merge commit and therefore appears in `files` nowhere.
So read `merge_files` separately, for the paths whose churn shows up only there, rather than discarding it as double counting.
Whether a flagged file is genuinely a god-class or legitimately large stays your judgment.
