---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-debugger-md-c7c6a4ba-c01"
title: "gsd-core: agents/gsd-debugger.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:agents/gsd-debugger.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-debugger.md\"}"
atom_ids:
  - branch-the-cause-across-categories-and-answer-the-and-gate
  - call-a-fix-verified-only-when-all-five-conditions-hold
  - fill-the-reasoning-checkpoint-before-you-propose-a-fix
  - record-the-prevention-block-when-you-archive-the-session
  - reproduce-defect-before-fixing
  - write-the-failing-test-before-you-fix-the-bug
  - write-the-session-state-before-you-act-not-after
atom_count: 7
atoms: "[{\"atom_id\":\"branch-the-cause-across-categories-and-answer-the-and-gate\",\"file_sha256\":\"73660ca7025e82942f6f6de43fb8fa8286635959f143e92eedead95a2521cc4d\",\"content_sha256\":\"3b97a55a225053c0abef99a154c9f47e8d85ee3fd177df651e5d30bed9467eaa\",\"file_bytes\":1516,\"body_bytes\":419},{\"atom_id\":\"call-a-fix-verified-only-when-all-five-conditions-hold\",\"file_sha256\":\"f4fa6da4219b5019e748e47834b251a9c3c0934848baee98c27d29fd01aba170\",\"content_sha256\":\"eead6d67e4a9a747ff6f06b97fed6963b69567fc4c10da9edc3c24d6ac8559b7\",\"file_bytes\":1467,\"body_bytes\":444},{\"atom_id\":\"fill-the-reasoning-checkpoint-before-you-propose-a-fix\",\"file_sha256\":\"a0060e5fe7c92c2bc2f019b7eac75f7ab75b9859d45a94eb72a6569c42a944a5\",\"content_sha256\":\"260f21747101ce3a24577431986ef4cfd8d6e7c6122eba443315319c7d0aa045\",\"file_bytes\":1595,\"body_bytes\":514},{\"atom_id\":\"record-the-prevention-block-when-you-archive-the-session\",\"file_sha256\":\"0fc27479999e41a36c71d659d112ebf98d39b203fecbe3902ec4b4b040106295\",\"content_sha256\":\"3b7b3dda762cf0ef713c113234184caa6aff5342a178e4460cbaf499bc88b41b\",\"file_bytes\":1557,\"body_bytes\":535},{\"atom_id\":\"reproduce-defect-before-fixing\",\"file_sha256\":\"e71d4dfa15409c3a154cb1aa2e7539e5b0d4b01e55e5d4280eda26f5aa629d7a\",\"content_sha256\":\"6235a9f8a0130a64ca86a8af164877dd232492222d038c1627c575f5ffb653c8\",\"file_bytes\":3450,\"body_bytes\":2010},{\"atom_id\":\"write-the-failing-test-before-you-fix-the-bug\",\"file_sha256\":\"dce1893f3aa9529718a30ffd27520452342131d31a49526e1efaec751f7ecdb7\",\"content_sha256\":\"bfc47cf60c0ee1746ab4c70c7f954877aaf047e9c7e8a21b8ebb298376fa7355\",\"file_bytes\":1470,\"body_bytes\":440},{\"atom_id\":\"write-the-session-state-before-you-act-not-after\",\"file_sha256\":\"7d57a2f58c166047fc51ba8d88955c2b10880ef72f95129411352a524a37e31f\",\"content_sha256\":\"52cb757a4ecce284857988b0d6ac352c24b88b5d09db622c09efa55bb2007670\",\"file_bytes\":1726,\"body_bytes\":642}]"
carrier_sha256: 8bcfd4417f0c3ec72083608093f7aa589c0bd9237870cf462341963792825dcd
carrier_bytes: 13876
revision: 1
status: active
---
<!-- vpmodule:atom:begin branch-the-cause-across-categories-and-answer-the-and-gate -->
---
instruction_id: branch-the-cause-across-categories-and-answer-the-and-gate
title: Branch the cause across categories and answer the and-gate
summary: Candidate causes are enumerated in more than one category and the question of whether several conditions must hold together is answered.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A hypothesis about the cause is formed.
conditions_does_not_apply_when: The failure is already explained by a single confirmed mechanism.
artifact_contract_output_type: cause-analysis
artifact_contract_required_data:
  - the candidate causes per category
  - the and-gate answer
artifact_contract_verified_by: at least two categories were considered and the and-gate was answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Branch the cause across categories and answer the and-gate
Branch, don't chain — at hypothesis formation (so it's done before the Phase 4 commit), enumerate candidate causes across ≥2 Ishikawa categories (code / config / environment / data) and answer the AND-gate check
cause in a DIFFERENT category — single-category is not a branch
Single-cause is fine when the AND-gate is no — but you must have checked.
<!-- vpmodule:atom:end branch-the-cause-across-categories-and-answer-the-and-gate -->
<!-- vpmodule:atom:begin call-a-fix-verified-only-when-all-five-conditions-hold -->
---
instruction_id: call-a-fix-verified-only-when-all-five-conditions-hold
title: Call a fix verified only when all five conditions hold
summary: "The original symptom is gone, the mechanism is understood, the neighbours still work, it works elsewhere, and it is stable."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A fix is reported as verified.
conditions_does_not_apply_when: The fix is still being developed.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the five conditions
artifact_contract_verified_by: all five conditions were checked and a missing one keeps the fix unverified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Call a fix verified only when all five conditions hold
Original issue no longer occurs - Exact reproduction steps now produce correct behavior
You understand why the fix works - Can explain the mechanism (not "I changed X and it worked")
Related functionality still works - Regression testing passes
Fix works across environments - Not just on your machine
Fix is stable - Works consistently, not "worked once"
Anything less is not verified.
<!-- vpmodule:atom:end call-a-fix-verified-only-when-all-five-conditions-hold -->
<!-- vpmodule:atom:begin fill-the-reasoning-checkpoint-before-you-propose-a-fix -->
---
instruction_id: fill-the-reasoning-checkpoint-before-you-propose-a-fix
title: Fill the reasoning checkpoint before you propose a fix
summary: "The hypothesis, its evidence, the falsification test and the blind spots are written down before any code changes."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A fix is about to be proposed.
conditions_does_not_apply_when: The diagnosis is only being reported and no fix is proposed.
artifact_contract_output_type: reasoning-checkpoint
artifact_contract_required_data:
  - the hypothesis
  - the confirming evidence
  - the falsification test
  - the blind spots
artifact_contract_verified_by: every field of the checkpoint holds a specific answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fill the reasoning checkpoint before you propose a fix
Before proposing any fix. This is MANDATORY — not optional.
Forces articulation of the hypothesis and its evidence BEFORE changing code. Catches fixes that address symptoms instead of root causes.
If you cannot fill all seven fields with specific, concrete answers — you do not have a confirmed root cause yet. Return to investigation_loop.
Is the confirming evidence direct observation, not inference?
Does the fix address the root cause or a symptom?
<!-- vpmodule:atom:end fill-the-reasoning-checkpoint-before-you-propose-a-fix -->
<!-- vpmodule:atom:begin record-the-prevention-block-when-you-archive-the-session -->
---
instruction_id: record-the-prevention-block-when-you-archive-the-session
title: Record the prevention block when you archive the session
summary: Closing a session writes down which gate should have caught the defect and which artifact stops it from coming back.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A diagnosis is closed and archived.
conditions_does_not_apply_when: The investigation is still open.
artifact_contract_output_type: knowledge-entry
artifact_contract_required_data:
  - why it was not caught
  - the recurrence guard
artifact_contract_verified_by: the entry names the missing gate and a concrete guard
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Record the prevention block when you archive the session
produce the **Prevention block** — a blameless postmortem (branching 5-Whys per RCA, "why wasn't this caught?", and a concrete recurrence guard):
Why not caught: {which existing gate (test/typecheck/lint/review/verify/build) should have caught it — or "no gate existed for this class"}
Recurrence guard: {concrete artifact preventing this class from returning — regression test (path:name) / assertion / lint rule / KB pattern / type refinement / config-default change}
<!-- vpmodule:atom:end record-the-prevention-block-when-you-archive-the-session -->
<!-- vpmodule:atom:begin reproduce-defect-before-fixing -->
---
instruction_id: reproduce-defect-before-fixing
title: Reproduce the defect before fixing it
summary: Get a stable reproduction and a failing test before changing code; every shipped line traces to runtime evidence.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: There is a defect report or observed incorrect behavior.
conditions_does_not_apply_when: "A new capability is needed, not a fix to existing behavior."
artifact_contract_output_type: reproduction
artifact_contract_required_data:
  - minimal input
  - expected result
  - actual result
  - test
artifact_contract_verified_by: the reproduction test failing before the fix and passing after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/bug-fix.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/debug.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Reproduce the defect before fixing it
You own the task: plan, review, verify.
Be scientific: every shipped line traces to runtime evidence.
Belt-and-suspenders that "might help" is a hypothesis, not a fix; it does not ship.
When evidence refutes a hypothesis, revert what it motivated.
The smallest change the evidence justifies ships, nothing more.
Reproduce it yourself on the matching surface.
Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes.
If it will not reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
Binary-search the cause: form the candidate hypotheses, then rule them out until one survives.
Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate.
When program state is unclear, add instrumentation or logging and read it as the code runs.
Do not guess.
Confirm the surviving mechanism with runtime evidence before planning the fix.
Plan the fix; if it crosses a function boundary, design the shape first.
Verify on the same surface: the original reproduction now passes.
"Inconclusive" or wrong-surface is not a pass; flag it.
Unit tests show branch behavior, not bug absence.
Stage the commits so the failing reproduction lands before the fix in history.
Skip the failing-test-first cadence when the test would be expensive, integration-heavy, or unclear.
Paste the failing-then-passing reproduction output verbatim.
Gather the symptom fields before investigating: expected behavior, actual behavior, error messages, timeline, reproduction.
A value the user already supplied is shown back and confirmed instead of being asked again.
Golden rule: If you can't reproduce the bug, you can't verify it's fixed.
Before fixing: Document exact steps to reproduce
After fixing: Execute the same steps exactly
Test edge cases: Related scenarios
Solution: Revert fix. If bug comes back, you've verified fix addressed it.
<!-- vpmodule:atom:end reproduce-defect-before-fixing -->
<!-- vpmodule:atom:begin write-the-failing-test-before-you-fix-the-bug -->
---
instruction_id: write-the-failing-test-before-you-fix-the-bug
title: Write the failing test before you fix the bug
summary: "A test that reproduces the defect is written and watched fail; if it cannot fail, the hypothesis is wrong."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A defect with a confirmed cause is about to be fixed.
conditions_does_not_apply_when: The defect cannot be reproduced in a test at all.
artifact_contract_output_type: regression-test
artifact_contract_required_data:
  - the test
  - the failing output before the fix
artifact_contract_verified_by: the test was observed failing before the fix and passing after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the failing test before you fix the bug
Write a failing test that reproduces the bug, then fix until the test passes.
Test MUST fail before the fix is applied
If the test cannot be made to fail initially, this indicates either:
The test does not correctly reproduce the bug (rewrite it)
The root cause hypothesis is wrong (return to investigation_loop)
Never skip the red phase. A test that passes before the fix tells you nothing.
<!-- vpmodule:atom:end write-the-failing-test-before-you-fix-the-bug -->
<!-- vpmodule:atom:begin write-the-session-state-before-you-act-not-after -->
---
instruction_id: write-the-session-state-before-you-act-not-after
title: "Write the session state before you act, not after"
summary: "The state file is updated before the next step so that a reset shows what was about to happen, and the next action is concrete."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: A long-running investigation keeps its state on disk.
conditions_does_not_apply_when: The work fits in one turn and needs no state file.
artifact_contract_output_type: session-state
artifact_contract_required_data:
  - the status
  - the focus
  - the next action
artifact_contract_verified_by: the state file was written before the action and the next action names a concrete step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Write the session state before you act, not after
Update the file BEFORE taking action, not after. If context resets mid-action, the file shows what was about to happen.
Current Focus | OVERWRITE | Before every action
Symptoms | IMMUTABLE | After gathering complete
Evidence | APPEND | After each finding
`next_action` must be concrete and actionable. Bad examples: "continue investigating", "look at the code". Good examples: "Add logging at line 47 of auth.js to observe token value before jwt.verify()", "Run test suite with NODE_ENV=production to check env-specific behavior", "Read full implementation of getUserById in db/users.cjs".
<!-- vpmodule:atom:end write-the-session-state-before-you-act-not-after -->