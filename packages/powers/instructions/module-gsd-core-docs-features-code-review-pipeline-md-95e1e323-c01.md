---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-features-code-review-pipeline-md-95e1e323-c01"
title: "gsd-core: docs/features/code-review-pipeline.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:docs/features/code-review-pipeline.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/features/code-review-pipeline.md\"}"
atom_ids:
  - bind-a-recorded-decision-to-the-finding-not-the-id
  - fall-back-to-the-undecided-state-on-an-unknown-value
  - triage-automated-review-findings
atom_count: 3
atoms: "[{\"atom_id\":\"bind-a-recorded-decision-to-the-finding-not-the-id\",\"file_sha256\":\"6f5ae078f35dec5a2ff4d30616946e5ad3b19facf9bfcd4d2e71d5616b202c3b\",\"content_sha256\":\"9edc55a6dec3521707e34bb34bede7f9cd4eb29293e08aafcce98a540c036861\",\"file_bytes\":2119,\"body_bytes\":928},{\"atom_id\":\"fall-back-to-the-undecided-state-on-an-unknown-value\",\"file_sha256\":\"7c15e32314db3f4ea1690d768340a50b3978c387c74152e71acb5d9f0dc57e7b\",\"content_sha256\":\"6bcaf1f48cb8f17b0714266cbd9989090107927c0f229e1f9e79de6ce1967047\",\"file_bytes\":1526,\"body_bytes\":383},{\"atom_id\":\"triage-automated-review-findings\",\"file_sha256\":\"a28571315789e494ad54658e23f42c9523d9d55aa70c33e424b6fb836e08f2fd\",\"content_sha256\":\"6e7764abd723e87cdc1cdfbf1f6bf0e103f81376a3bba12088da5795abb54507\",\"file_bytes\":3370,\"body_bytes\":2141}]"
carrier_sha256: f0562d6ce97ad7b130bbe01e801b60db9bd9dc65c19f452e22cbbd2b86bdb5fa
carrier_bytes: 7456
revision: 1
status: active
---
<!-- vpmodule:atom:begin bind-a-recorded-decision-to-the-finding-not-the-id -->
---
instruction_id: bind-a-recorded-decision-to-the-finding-not-the-id
title: "Bind a recorded decision to the finding, not to the id"
summary: "A recorded decision travels with the finding it names, not with the reusable label, so a renumbered finding does not inherit an old decision."
capability_tags:
  - triage-reports
pattern_tags:
  - stable-identity
conditions_applies_when: A decision about a finding is recorded in a ledger that survives a re-review.
conditions_does_not_apply_when: The finding identifier is never reused.
artifact_contract_output_type: finding-identity
artifact_contract_required_data:
  - the finding the decision belongs to
  - the identity the decision is bound to
  - what the decision says about it
artifact_contract_verified_by: a decision is carried forward only while the identifier still names the same finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/code-review-pipeline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bind a recorded decision to the finding, not to the id
A decision belongs to a finding, not to an ID.
IDs are reused across re-reviews — `--auto` renumbers — so the ledger records each finding's title alongside its disposition, and a recorded decision is carried forward only while the ID still names the same finding.
Without that, a prior `CR-01 fixed` would be inherited by a brand-new `CR-01`, which is a false decision in the one artifact whose purpose is telling triaged from forgotten.
Titles are compared with runs of whitespace collapsed, so a fixer that re-spaces a title still reconciles.
Reconciliation applies an outcome only when the fix report names the **same** finding, because finding IDs are reused across re-reviews and a stale report would otherwise declare a brand-new `CR-01` already fixed.
The drop is reported on the console, naming the ID and what had been decided — for a *recorded* decision.
<!-- vpmodule:atom:end bind-a-recorded-decision-to-the-finding-not-the-id -->
<!-- vpmodule:atom:begin fall-back-to-the-undecided-state-on-an-unknown-value -->
---
instruction_id: fall-back-to-the-undecided-state-on-an-unknown-value
title: Fall back to the undecided state on an unknown value
summary: A disposition column is a closed vocabulary; a value outside it is not a decision and the row falls back to the undecided state.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A disposition is read from a record that a person may have edited.
conditions_does_not_apply_when: The value is produced by the tool and never edited by hand.
artifact_contract_output_type: disposition-fallback
artifact_contract_required_data:
  - the closed vocabulary of dispositions
  - the value that was read
  - the state the row falls back to
artifact_contract_verified_by: a value outside the vocabulary leaves the row undecided
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/code-review-pipeline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Fall back to the undecided state on an unknown value
The disposition column is a closed vocabulary — `open`, `fixed`, `skipped`, `deferred`.
A hand-edited value outside it is not treated as a decision: the row falls back to `open`, so a typo cannot quietly mark a phase as triaged.
`open` means recorded but not yet triaged, and it is the only value the gate assigns on its own.
<!-- vpmodule:atom:end fall-back-to-the-undecided-state-on-an-unknown-value -->
<!-- vpmodule:atom:begin triage-automated-review-findings -->
---
instruction_id: triage-automated-review-findings
title: Triage automated review findings without blind trust
summary: "Classify each automated comment as fix, dismiss, or ask, and fix the root cause instead of disabling the rule."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: An automated review or linter returned a set of findings against the change.
conditions_does_not_apply_when: The findings came from a person and need a different kind of triage.
artifact_contract_output_type: automated-finding-triage
artifact_contract_required_data:
  - confirmed
  - "false"
  - deferred
  - reason
  - check added
artifact_contract_verified_by: the rule re-run after the fix with no recurrence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/references/bugbot-triage.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/code-review-pipeline.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Triage automated review findings without blind trust
Use this when review-automation comments arrive on a change.
The goal is not to ignore the automation by default; it is to stop treating every comment as a required code change.
Classify each thread before acting.
Fix: the comment identifies a plausible correctness, security, privacy, data loss, auth, billing, migration, idempotency, race, or shipped-behavior issue.
Fix it in the lowest owning change, then reply with the commit and resolve the thread.
Dismiss: the comment matches a documented low-risk noisy pattern, and the current code and context prove the concern does not need a code change.
Reply with a short reason and resolve the thread.
Ask: the comment is novel, high-severity, security or privacy or data-related, or ambiguous.
Ask the user instead of guessing.
When in doubt, ask.
Skipping a noisy code-quality comment is cheap; skipping a real data or security bug is not.
Do not auto-skip security, privacy, auth, billing, data retention, and permission-boundary findings.
Do not auto-skip high-severity findings.
Do not auto-skip migration, schema, idempotency, concurrency, and cross-system behavior findings.
Treat those as owner judgment calls, not team-wide skip rules.
Run the cited test before classifying a contract-test drift claim; a red run confirms the claim and a green run disproves it.
Record repeatable noise patterns with confidence, skip conditions, do-not-skip boundaries, an example signal, and a source.
Use candidate for one or two examples, recurring after multiple real dismissals, and strong only when the pattern is narrow, repeatedly verified, and low-risk.
Fix the root cause rather than disabling the rule.
Re-run the rule after the fix and confirm no recurrence.
External findings are unverified corroborating evidence
independently re-verifies every claim against the actual source before writing it to `REVIEW.md`, so there remains exactly one `REVIEW.md` schema regardless of how many lanes ran.
An explicitly requested lane that is unavailable or fails is reported as a warning, never silently dropped and never a raw-CLI fallback.
<!-- vpmodule:atom:end triage-automated-review-findings -->