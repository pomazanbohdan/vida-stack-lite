---
instruction_id: never-hide-a-gap-in-the-evidence
title: Never hide a gap in the evidence
summary: "A missing input is declared and narrows the scope of the analysis; the reader can always tell \"checked and clean\" from \"never checked\"."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
  - evidence-analysis
  - code-audit
  - empty-result-policy
conditions_applies_when: An analysis needs an input that the evidence may not contain.
conditions_does_not_apply_when: Every input the analysis needs is available.
artifact_contract_output_type: evidence-gaps
artifact_contract_required_data:
  - the missing input
  - the analysis that was narrowed
  - the narrowed scope
artifact_contract_verified_by: "every gap names the analysis it narrowed, and no analysis that was skipped is presented as clean"
compatibility_excludes:
  - delete-an-empty-section-instead-of-writing-none
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/evidence-gathering.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone/detail/elaboration.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/next.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verifier-evidence-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/no-silent-swallow-no-verdict-from-dropped-data.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/unreadable-directory-scope-signal.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/improved-prompt-injection-scanner.md
status: active
revision: 2
---

# Never hide a gap in the evidence
Evidence availability varies; never hide a gap.
Each later analysis declares what it needs and, when that input is absent, records a narrowed scope rather than guessing.
A reader of the final retro must always be able to tell **"checked and clean"** from **"never checked."**
Missing session logs → process-lesson analysis is skipped, and the retro says so.
No Done when in the epic file → the verdict is profiled from the diff and plans, flagged as profiled rather than declared.
Sub-agents unavailable → analyses that would delegate run inline over a narrowed scope, and the narrowing is recorded.
A close is clean only because the items acknowledged at an earlier close are still being suppressed, not because everything was fixed this time.
A scan that failed, or whose scope did not cover the whole input, is a non-answer and not an empty result: report it and narrow the scope, never report it as clean.
Include this section (even if empty, stating "None") whenever `is_re_verification = true` ran — an omitted section reads as "not checked," not "checked and clean."
If signals are too thin to choose, output `UNKNOWN` with `low` confidence and list observed signals in `notes`.
Downgrade confidence silently — when unsure, output `UNKNOWN` with signals in `notes`
a failure or a gap in the input must not be absorbed into an output that reads as authoritative.
A routine that drops data it could not read or could not resolve, and then reports a clean result anyway, turns a diagnosable gap into a confidently wrong answer.
Each now distinguishes "could not read" from "does not exist"
still cannot tell "genuinely no context file" from "could not read the directory at all."
A scanner that could not establish its file list MUST NOT report clean
distinguish four outcomes rather than collapsing them into exit 0
