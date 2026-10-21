---
instruction_id: report-the-review-result-with-counts-and-the-rejected-appendix
title: Report the review result with counts and the rejected appendix
summary: "State the counts by bucket, list every rejected finding with its reason, and say where the findings were written."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The triage is finished and the result has to be reported.
conditions_does_not_apply_when: The triage is still running.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the counts by bucket
  - the rejected appendix
  - where the findings were written
artifact_contract_verified_by: "the report states the counts, every rejected finding appears with its reason, and the reader knows where the findings are"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-04-present.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/code-review-pipeline.md
status: active
revision: 2
---

# Report the review result with counts and the rejected appendix
If `failed_layers` is non-empty, report which layers failed before announcing results.
If zero entries remain after rejections AND `failed_layers` is non-empty, warn the user that the review may be incomplete rather than announcing a clean review.
If zero entries remain after triage (all rejected or none raised): state "✅ Clean review — all layers passed."
Code review complete. <D> `decision-needed`, <P> `patch`, <W> `defer`, <R> rejected.
The `Rejected` appendix is one line per rejected finding: `false` with its refutation, `Minor` with why it was not worth fixing.
Without `plan_file`, it ends the chat listing.
The listing is the review itself. List `decision-needed` entries first, then `patch`, then `defer`, then the `Rejected` appendix, highest severity first within each.
Each `decision-needed` entry carries its options and the recommended one and is marked open -- nothing was decided.
Each `patch` entry carries its location and the fix.
If `plan_file` is set, add: `Findings written to {plan_file}.`
Otherwise add: `Findings are listed above. No plan was provided, so nothing was persisted.`
If the review's `total:` exceeds the number of findings whose headings the gate could parse, the shortfall is stated — on the console and as an `unparsed:` key in the ledger's frontmatter.
A finding the gate cannot record is the one a human most needs to see, so it is never dropped silently.
the gate has no trustworthy number to reconcile against and withholds the key rather than reporting a figure derived from one
