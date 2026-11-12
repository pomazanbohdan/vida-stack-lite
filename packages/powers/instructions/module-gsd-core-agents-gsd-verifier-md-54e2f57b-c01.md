---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-verifier-md-54e2f57b-c01"
title: "gsd-core: agents/gsd-verifier.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:agents/gsd-verifier.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-verifier.md\"}"
atom_ids:
  - a-passed-verdict-requires-an-empty-human-verification-list
  - an-accepted-override-counts-as-a-pass-not-as-a-failure
  - call-it-a-stub-only-when-the-empty-value-reaches-the-user
  - defer-a-gap-only-against-specific-evidence-in-a-later-phase
  - let-the-derived-plan-add-to-the-contract-but-never-subtract-from-it
  - prove-a-test-exists-by-enumeration-and-passes-by-one-named-run
  - treat-an-unreferenced-debt-marker-as-a-blocker
atom_count: 7
atoms: "[{\"atom_id\":\"a-passed-verdict-requires-an-empty-human-verification-list\",\"file_sha256\":\"a914d09174630a555cd41e09c4895822a125688ee5d272efd2528e1de00d725f\",\"content_sha256\":\"7c3822253cf04af28dfdfa2fcaf900acfa631f35f912852e87ca89be83598150\",\"file_bytes\":1523,\"body_bytes\":444},{\"atom_id\":\"an-accepted-override-counts-as-a-pass-not-as-a-failure\",\"file_sha256\":\"febbe3f70fd343347fd7a49dcb21d3a252cd833f90a9e5b8a48b9921599b0b04\",\"content_sha256\":\"ea664e33cbf9813d9a73caa820d8c57887826d341e0f69a426cbc9c15f5df8b2\",\"file_bytes\":1411,\"body_bytes\":303},{\"atom_id\":\"call-it-a-stub-only-when-the-empty-value-reaches-the-user\",\"file_sha256\":\"69a4fb8bafd0550a0820c95965f8928c63e95e8fc9d19a359c3674d824096f80\",\"content_sha256\":\"8a6f86330c1cd6aa8fa05a3d604adddbe6989d91186260c41ab113d102dfbe2f\",\"file_bytes\":1620,\"body_bytes\":451},{\"atom_id\":\"defer-a-gap-only-against-specific-evidence-in-a-later-phase\",\"file_sha256\":\"222dbd8e15a0dc7134e2d8c3978de9a7afcaac1063c1e5f6ead28deab1d6ef7d\",\"content_sha256\":\"293bf6e20a8bf9c48b1c9ae05933e8b2eebd9b2089eeda87fe5903847be6ae54\",\"file_bytes\":1449,\"body_bytes\":367},{\"atom_id\":\"let-the-derived-plan-add-to-the-contract-but-never-subtract-from-it\",\"file_sha256\":\"34316ac9c91e372e4a48affc514b4387eb39627d29616ac09884dd32a3bee84f\",\"content_sha256\":\"008fde4ca0067ee5fd7440b5553cc0afeb4c23284c6ae4caadabcddd77b17f7c\",\"file_bytes\":1422,\"body_bytes\":307},{\"atom_id\":\"prove-a-test-exists-by-enumeration-and-passes-by-one-named-run\",\"file_sha256\":\"2b81fe95a53f390d5a19c61642ebf999761c735c7f40263e8981150d45f7f433\",\"content_sha256\":\"521377dd191c72c5e221f6f72913cc1d7b73aac6eb8c6c656f77f148a8facf0b\",\"file_bytes\":1751,\"body_bytes\":603},{\"atom_id\":\"treat-an-unreferenced-debt-marker-as-a-blocker\",\"file_sha256\":\"aac3b63a93462120b552796bfaf2460f038c8f3766daa28477653d11fa38527e\",\"content_sha256\":\"0914fe955215350dd6cdc4dcb143237386d2b3419016a0076089b2b0a036ab0f\",\"file_bytes\":1455,\"body_bytes\":374}]"
carrier_sha256: dbc10f80d2c9bf9034f2a55fbbaa02cbdcef4a9638872c7cfd051f3265dca2ac
carrier_bytes: 11842
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-passed-verdict-requires-an-empty-human-verification-list -->
---
instruction_id: a-passed-verdict-requires-an-empty-human-verification-list
title: A passed verdict requires an empty human-verification list
summary: The passing verdict is only available when nothing was left for a human; otherwise the verdict is that a human is needed.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A verification decides its overall verdict.
conditions_does_not_apply_when: The run is not a verification of a phase goal.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the verdict
  - the human-verification list that was empty or not
artifact_contract_verified_by: the verdict is passed only when the human-verification list is empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A passed verdict requires an empty human-verification list
**passed is ONLY valid when the human verification section is empty.** If Step 8 produced any items — including any truth left ⚠️ PRESENT_BEHAVIOR_UNVERIFIED — the status is not `passed`: it is `human_needed`, or `gaps_found` when rule 1 also fires (the ordered tree keeps gaps_found's precedence).
Classify status using this decision tree IN ORDER (most restrictive first):
<!-- vpmodule:atom:end a-passed-verdict-requires-an-empty-human-verification-list -->
<!-- vpmodule:atom:begin an-accepted-override-counts-as-a-pass-not-as-a-failure -->
---
instruction_id: an-accepted-override-counts-as-a-pass-not-as-a-failure
title: "An accepted override counts as a pass, not as a failure"
summary: A recorded override carries the item as passed and names who accepted it and when; a failure that looks deliberate earns an override suggestion.
capability_tags:
  - verify-work-results
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A criterion failed but a deviation has been accepted.
conditions_does_not_apply_when: No deviation has been accepted.
artifact_contract_output_type: verification-verdict
artifact_contract_required_data:
  - the override reason
  - who accepted it
  - when
artifact_contract_verified_by: the overridden item is counted as passing and the acceptance is recorded with its reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# An accepted override counts as a pass, not as a failure
**If override found:**
- Mark as `PASSED (override)` instead of FAIL/PRESENT_BEHAVIOR_UNVERIFIED
- Evidence: `Override: {reason} — accepted by {accepted_by} on {accepted_at}`
- Count toward passing score (`verified_truths`), not failing score
<!-- vpmodule:atom:end an-accepted-override-counts-as-a-pass-not-as-a-failure -->
<!-- vpmodule:atom:begin call-it-a-stub-only-when-the-empty-value-reaches-the-user -->
---
instruction_id: call-it-a-stub-only-when-the-empty-value-reaches-the-user
title: Call it a stub only when the empty value reaches the user
summary: An empty literal is a stub only when it reaches the rendered output and nothing else fills it; a type default or a state that is overwritten is not a stub.
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: A pattern match on an empty value has been found in a changed file.
conditions_does_not_apply_when: The pattern match is not an empty value at all.
artifact_contract_output_type: finding
artifact_contract_required_data:
  - the pattern that matched
  - whether the value reaches the output
  - what else populates it
artifact_contract_verified_by: the stub verdict names the path to the output and the other code path that fills the value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Call it a stub only when the empty value reaches the user
**Stub classification:** A grep match is a STUB only when the value flows to rendering or user-visible output AND no other code path populates it with real data. A test helper, type default, or initial state that gets overwritten by a fetch/store is NOT a stub. Check for data-fetching (useEffect, fetch, query, useSWR, useQuery, subscribe) that writes to the same variable before flagging.
<!-- vpmodule:atom:end call-it-a-stub-only-when-the-empty-value-reaches-the-user -->
<!-- vpmodule:atom:begin defer-a-gap-only-against-specific-evidence-in-a-later-phase -->
---
instruction_id: defer-a-gap-only-against-specific-evidence-in-a-later-phase
title: Defer a gap only against specific evidence in a later phase
summary: A gap moves to the deferred list only when a later phase names it; a vague match keeps it a real gap.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A gap could be scheduled for a later phase of the same milestone.
conditions_does_not_apply_when: No later phase exists.
artifact_contract_output_type: gap-triage
artifact_contract_required_data:
  - the gap
  - the later phase that covers it
  - the quoted evidence
artifact_contract_verified_by: "every deferred gap names the later phase and quotes it, and the deferred ones do not change the verdict"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Defer a gap only against specific evidence in a later phase
**Important:** Be conservative when matching. Only defer a gap when there is clear, specific evidence in a later phase's roadmap section. Vague or tangential matches should NOT cause a gap to be deferred — when in doubt, keep it as a real gap.
**Deferred items do NOT affect the status determination.**
<!-- vpmodule:atom:end defer-a-gap-only-against-specific-evidence-in-a-later-phase -->
<!-- vpmodule:atom:begin let-the-derived-plan-add-to-the-contract-but-never-subtract-from-it -->
---
instruction_id: let-the-derived-plan-add-to-the-contract-but-never-subtract-from-it
title: Let the derived plan add to the contract but never subtract from it
summary: A plan may add criteria to the agreed ones; the criteria the contract already fixed are all still verified.
capability_tags:
  - verify-work-results
pattern_tags:
  - frozen-intent
conditions_applies_when: A derived plan lists fewer criteria than the contract it was derived from.
conditions_does_not_apply_when: The plan lists all the contract criteria.
artifact_contract_output_type: coverage-check
artifact_contract_required_data:
  - the contract criteria
  - the criteria the plan added
artifact_contract_verified_by: every contract criterion is still verified and the plan only ever added criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Let the derived plan add to the contract but never subtract from it
**CRITICAL:** PLAN frontmatter must-haves must NOT reduce scope. If ROADMAP.md defines 5 Success Criteria but the plan only lists 3 in must_haves, all 5 must still be verified. The plan can ADD must-haves but never subtract roadmap SCs.
<!-- vpmodule:atom:end let-the-derived-plan-add-to-the-contract-but-never-subtract-from-it -->
<!-- vpmodule:atom:begin prove-a-test-exists-by-enumeration-and-passes-by-one-named-run -->
---
instruction_id: prove-a-test-exists-by-enumeration-and-passes-by-one-named-run
title: Prove a test exists by enumeration and passes by one named run
summary: "Existence is proved by listing the tests, passing by running the one named test; the full suite runs at most once."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verification has to establish that a test exists and that it passes.
conditions_does_not_apply_when: The full suite already ran once in this verification.
artifact_contract_output_type: verification-evidence
artifact_contract_required_data:
  - the enumerated test
  - the named test that was run
  - its result
artifact_contract_verified_by: the suite ran at most once and no test was claimed on the strength of a filtered run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove a test exists by enumeration and passes by one named run
**Run the full workspace test command at most once per verification.** Never filter a full run per must-have (`<full-suite> 2>&1 | grep X` repeated per truth) — it re-runs everything and yields no new evidence. Prove a test exists by enumeration (`--list` / `--collect-only`); prove one passes via a single named test. If a full run is genuinely required, run it once and `grep` the saved output.
# A test EXISTS (existence proof — enumerate, do NOT run the suite)
# A specific test PASSES (run ONE named test, never the whole suite)
<!-- vpmodule:atom:end prove-a-test-exists-by-enumeration-and-passes-by-one-named-run -->
<!-- vpmodule:atom:begin treat-an-unreferenced-debt-marker-as-a-blocker -->
---
instruction_id: treat-an-unreferenced-debt-marker-as-a-blocker
title: Treat an unreferenced debt marker as a blocker
summary: A debt marker in the changed files blocks the close-out unless the same line points at follow-up work that exists.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The changed files carry a debt marker.
conditions_does_not_apply_when: Every marker names a follow-up item.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - each marker
  - the follow-up it names or the fact that it names none
artifact_contract_verified_by: no marker without a follow-up reference is left unreported and the status carries the gap
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat an unreferenced debt marker as a blocker
**Debt marker gate:** Any `TBD`, `FIXME`, or `XXX` marker in a file modified by this phase is a 🛑 BLOCKER unless the same line references formal follow-up work (`issue #123`, `PR #123`, `#123`, or `DEF-*`). Unreferenced markers mean completion is not auditable; set `status: gaps_found` and list each marker under `gaps`.
<!-- vpmodule:atom:end treat-an-unreferenced-debt-marker-as-a-blocker -->