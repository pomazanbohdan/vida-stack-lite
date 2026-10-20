---
instruction_id: write-few-meaningful-comments
title: Write few meaningful comments
summary: "Delete comments the code already tells you, keep the ones about constraints you cannot change, and encode those constraints in structure where possible."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: You add or review comments in code.
conditions_does_not_apply_when: The comment is a required element of an external format.
artifact_contract_output_type: commented-code
artifact_contract_required_data:
  - reason
  - scope of the pass
  - comments removed
  - check that each kept comment matches current code
artifact_contract_verified_by: each remaining comment checked against the current code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/no-comments/SKILL.md
status: active
revision: 1
---

# Write few meaningful comments
Use the caller's files or diff; otherwise use the current diff against the base branch, default main, including the working tree.
Inspect the report and the diff.
Reject application-code edits, scope escapes, exception-protected deletions, misstated kill reasons, and flags that treat kept intentional code as guilty.
Reshape flags on surprises in our own code stay actionable.
Do not restore those comments.
A keep survives only with proof it is about something we cannot change.
Audit missed scoped lint and type suppressions.
Correctness or safety suppressions stay actionable kills.
Restore deletions only with exact exceptions and scoped proof.
Before accepting thin "IMPORTANT" or "do not remove" kills or keeps, ask how or why the symbol is used.
If a kill is ambiguous, do not restore.
If a keep is refuted or still ambiguous, delete it.
Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API.
If any fix needs a shape, sketch it once for the accepted set and surrounding code; stop at the sketch.
Implement the smallest root-cause fix in scope.
Remove every named workaround.
If the root cause is out of scope, land the smallest in-scope fix and report the rest open.
Never bolt on symptom guards.
Constraint comments say "do not remove", "do not change wording", or "talk to X before changing".
Leave keeps about things we cannot change.
Offer the cheapest in-scope type, runtime, test, or CI lint; wait for approval.
If approved, encode the constraint then delete the comment.
Otherwise delete it, report the constraint open, and sketch out-of-scope work.
Report the deletion count, restored comments, reruns, sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.
