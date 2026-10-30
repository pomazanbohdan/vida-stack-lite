---
instruction_id: route-each-finding-to-decide-patch-or-defer
title: "Route each finding to decide, patch, or defer"
summary: "Every entry lands in exactly one bucket: a decision that needs the human, a patch that needs no one, or a deferral that is not this change's problem."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The findings are grouped and each group has to be given a disposition.
conditions_does_not_apply_when: The groups are still being verified.
artifact_contract_output_type: routed-findings
artifact_contract_required_data:
  - the bucket of every entry
  - the options and the recommendation for a decision
  - the reason for a deferral
artifact_contract_verified_by: "no entry sits in two buckets, and an entry this change caused is never deferred"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Route each finding to decide, patch, or defer
Route each entry into exactly one triage bucket.
A group that includes verified `Critical`, `Important`, or `Minor` members routes by its highest such verdict -- not to defer just because a member is `maybe-false`.
decision_needed -- There is an ambiguous choice that requires human input. The code cannot be correctly patched without knowing the user's intent.
Applies in every mode, with or without a plan, and whether or not a human can answer during this run -- the choice then falls to whoever reads the review.
Record the options (each plausible fix, one line) and the one you recommend, with the reason.
patch -- Code issue that is fixable without human input. The correct fix is unambiguous, adds no public surface, and guards no state you did not demonstrate; otherwise `decision_needed`.
defer -- Pre-existing issue not caused by the current change, real but not actionable now;
or an entry whose members are all `maybe-false` and the claim, if true, would be `Important` or `Critical` -- record that severity marked unverified, plus what would settle it (if it would only be `Minor`, reject it with the same note);
or any entry whose fix edits agent-context files
An entry this change caused, with a verified `Critical`, `Important`, or `Minor` member, is never `defer`, whatever its fix touches: it is `patch` or `decision_needed`.
defer is only for what is not this change's problem.
