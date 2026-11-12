---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-code-review-step-03-triage-md-44310489-c01"
title: "bmad-method: skills/bmad-code-review/step-03-triage.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-code-review/step-03-triage.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-code-review/step-03-triage.md\"}"
atom_ids:
  - prove-a-refuted-finding-and-name-what-would-settle-an-undecided-one
  - reject-the-findings-that-do-not-earn-their-place
  - render-one-verdict-per-finding
  - report-the-review-result-with-counts-and-the-rejected-appendix
  - route-each-finding-to-decide-patch-or-defer
atom_count: 5
atoms: "[{\"atom_id\":\"prove-a-refuted-finding-and-name-what-would-settle-an-undecided-one\",\"file_sha256\":\"41eccde7cbe85ac1ed36e39aacb83e7568bdc136112fe30faa07cb0104871e86\",\"content_sha256\":\"a397ae838543512f209179803577b2b37cbecc0606138eb7ae89423d6c938949\",\"file_bytes\":1740,\"body_bytes\":548},{\"atom_id\":\"reject-the-findings-that-do-not-earn-their-place\",\"file_sha256\":\"51c9fc9560a967d691f10d5708a28e8cc28c7a72b9f3aabc3e634e71b922437b\",\"content_sha256\":\"a2d3a2144b20547775126a8d9681731def8b21813170c437d875b518a965cdc6\",\"file_bytes\":1715,\"body_bytes\":536},{\"atom_id\":\"render-one-verdict-per-finding\",\"file_sha256\":\"8b07b45173c035220697bd5505410dc110c4679ab4adbe9bb6472aee8159ad35\",\"content_sha256\":\"9a504f28c59f9c42e36eaddafee9d9d43fb3f40911f19266fb580c078ef4ff58\",\"file_bytes\":2407,\"body_bytes\":1233},{\"atom_id\":\"report-the-review-result-with-counts-and-the-rejected-appendix\",\"file_sha256\":\"a06092159f2e62975d37be495eedbe009f74145c6dbc9d5de2ab459c5d1eabb8\",\"content_sha256\":\"0f7093c2700adcd9a49550851db8b09d60f7d145bbd2368b70d6e62d80ec8dfb\",\"file_bytes\":3199,\"body_bytes\":1742},{\"atom_id\":\"route-each-finding-to-decide-patch-or-defer\",\"file_sha256\":\"9c9fe319e34a188ca6f62e58150a4b3dc1bb6d095199b83f36092c84be172588\",\"content_sha256\":\"f05eece5d1b120c2b20a0989ced00f71ee498694506ee5e42c047a52d7ba86ea\",\"file_bytes\":2973,\"body_bytes\":1617}]"
carrier_sha256: f2486b89bd54b4537c7973e48ebe6a6954e95d8a37e7fc64e088af513b62b05b
carrier_bytes: 12823
revision: 1
status: active
---
<!-- vpmodule:atom:begin prove-a-refuted-finding-and-name-what-would-settle-an-undecided-one -->
---
instruction_id: prove-a-refuted-finding-and-name-what-would-settle-an-undecided-one
title: Prove a refuted finding and name what would settle an undecided one
summary: A finding whose bad outcome does not happen carries what disproves it; a finding you cannot decide carries what would settle it.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "The verification of a finding ended in \"the bad outcome does not happen\" or in \"you could not tell\"."
conditions_does_not_apply_when: The finding is confirmed and graded.
artifact_contract_output_type: refuted-and-undecided-findings
artifact_contract_required_data:
  - the refutation
  - what would settle the question
artifact_contract_verified_by: every refuted finding names what disproves it and every undecided one names what would settle it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prove a refuted finding and name what would settle an undecided one
`false` -- you checked, and the bad outcome does not happen at the cited location. Write what disproves this specific claim.
A true fact about nearby code that does not disprove the claim does not count.
`maybe-false` -- you could not tell whether the bad outcome happens. Write what you would need to check to find out.
Use this only when the diff and surrounding code leave the question open; when they are enough to decide, pick `Critical`, `Important`, `Minor`, or `false`.
<!-- vpmodule:atom:end prove-a-refuted-finding-and-name-what-would-settle-an-undecided-one -->
<!-- vpmodule:atom:begin reject-the-findings-that-do-not-earn-their-place -->
---
instruction_id: reject-the-findings-that-do-not-earn-their-place
title: Reject the findings that do not earn their place
summary: "Drop the findings the verification refuted, the negligible ones whose fix costs more than a correction, and the ones whose fix is to edit the plan under review; every rejection keeps its reason in the triage file."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The findings have been graded and some of them have to be dropped before the report.
conditions_does_not_apply_when: Every finding is confirmed and worth keeping.
artifact_contract_output_type: rejected-findings
artifact_contract_required_data:
  - each rejected finding
  - the reason it was rejected
artifact_contract_verified_by: every rejected finding carries the reason it was rejected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject the findings that do not earn their place
Reject `false` findings on their refutation.
Reject `Minor` findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly -- no proof needed) and the fix is more than a direct correction or deletion -- adding guards, branches, parameters, or other complexity.
Reject any finding whose fix is to edit the plan under review.
A rejected finding stays in `{triage_file}`, marked rejected, with the reason; later steps never silently drop one.
<!-- vpmodule:atom:end reject-the-findings-that-do-not-earn-their-place -->
<!-- vpmodule:atom:begin render-one-verdict-per-finding -->
---
instruction_id: render-one-verdict-per-finding
title: Render one verdict per finding
summary: "Grade every finding only after every lens has reported, ignore the severity the reviewer assigned, and apply one rubric based on the impact of a single occurrence rather than its rarity or fix cost."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The lenses have reported and the findings are waiting to be graded.
conditions_does_not_apply_when: The findings still have to be collected from the lenses.
artifact_contract_output_type: verdicted-findings
artifact_contract_required_data:
  - the verdict of every finding
  - the evidence behind every verdict
artifact_contract_verified_by: "every finding carries exactly one verdict and a sentence or two of evidence, and none is dropped"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Render one verdict per finding
Once every lens has reported — and not before — render a verdict on each finding, ahead of any grouping.
Disregard any severity a reviewing subagent assigned — they lack the context to grade.
Render exactly one verdict from what verification established — the verdict is the whole triage decision; there is no separate keep-or-dismiss:
`Critical` — data loss or corruption, a security exposure, a silently wrong result, or a path broken with no workaround.
`Important` — broken or wrong, but noticed and worked around, or limited in reach.
`Minor` — cosmetic or a minor inconvenience.
`false` — the finding is not real.
`maybe-false` — you cannot decide whether the finding is real; use it only when the diff and surrounding code leave the question open.
A gap finding from the verification-gap lens is `Important`; skip grading it.
Severity is the impact of a single occurrence. It does not depend on how rare the outcome is, how hard it is to fix, or whether the defect predates the change. If you cannot decide between `Important` and `Minor`, pick `Important`.
Every finding keeps its verdict and a sentence of evidence for the summary; never drop, merge, or silently skip one.
<!-- vpmodule:atom:end render-one-verdict-per-finding -->
<!-- vpmodule:atom:begin report-the-review-result-with-counts-and-the-rejected-appendix -->
---
instruction_id: report-the-review-result-with-counts-and-the-rejected-appendix
title: Report the review result with counts and the rejected appendix
summary: "Render from the triage file, state the counts by bucket, list every rejected finding with its reason, and say where the findings were written."
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-05-present.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/code-review-pipeline.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Report the review result with counts and the rejected appendix
`{triage_file}` is the source for every finding: its verdict, evidence, route, options and rejection reason. Render from it, not from memory.
If `failed_layers` is non-empty, report which lenses failed before announcing results.
If zero entries remain after rejections AND `failed_layers` is non-empty, warn the user that the review may be incomplete rather than announcing a clean review.
If zero entries remain after triage (all rejected or none raised): state "✅ Clean review — all lenses passed."
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
<!-- vpmodule:atom:end report-the-review-result-with-counts-and-the-rejected-appendix -->
<!-- vpmodule:atom:begin route-each-finding-to-decide-patch-or-defer -->
---
instruction_id: route-each-finding-to-decide-patch-or-defer
title: "Route each finding to decide, patch, or defer"
summary: "Every F finding lands in exactly one bucket: a decision that needs the human, a patch that needs no one, or a deferral that is not this change's problem; a fix that edits a ticket is deferred."
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-04-route.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Route each finding to decide, patch, or defer
Work from the `F` findings in `{triage_file}`: route each one into exactly one bucket and write the route into its block.
A group that includes verified `Critical`, `Important`, or `Minor` members routes by its highest such verdict — not to defer just because a member is `maybe-false`.
decision_needed — There is an ambiguous choice that requires human input. The code cannot be correctly patched without knowing the user's intent.
Applies in every mode, with or without a plan, and whether or not a human can answer during this run — then assign it anyway and leave the choice to whoever reads the review. Do not guess and patch.
Record the options (each plausible fix, one line) and the one you recommend, with the reason.
patch — Code issue that is fixable without human input. The correct fix is unambiguous, adds no public surface, and guards no state you did not demonstrate; otherwise `decision_needed`.
defer — Pre-existing issue not caused by the current change, real but not actionable now;
or an entry whose members are all `maybe-false` and the claim, if true, would be `Important` or `Critical` — record that severity marked unverified, plus what would settle it (if it would only be `Minor`, reject it with the same note);
or any entry whose fix edits agent-context files (CLAUDE.md, AGENTS.md, rules) or a ticket file.
An entry this change caused, with a verified `Critical`, `Important`, or `Minor` member, is never `defer`, whatever its fix touches: it is `patch` or `decision_needed`.
defer is only for what is not this change's problem.
<!-- vpmodule:atom:end route-each-finding-to-decide-patch-or-defer -->