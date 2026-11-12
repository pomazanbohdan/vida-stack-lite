---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-plan-checker-md-d210bf6c-c01"
title: "gsd-core: agents/gsd-plan-checker.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:agents/gsd-plan-checker.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-plan-checker.md\"}"
atom_ids:
  - a-plan-set-with-only-advisories-is-not-a-pass
  - measure-the-number-instead-of-believing-the-stale-document
  - state-the-invariant-the-plan-must-satisfy-not-the-edit
  - treat-a-silently-reduced-scope-as-a-blocking-finding
  - verify-the-plan-backwards-from-the-outcome
atom_count: 5
atoms: "[{\"atom_id\":\"a-plan-set-with-only-advisories-is-not-a-pass\",\"file_sha256\":\"04998c814288472e1621efd139843d579acdeb6346d2c438eb2afe3ef66a6014\",\"content_sha256\":\"4b4535501b36ef2cba459fc31724aa5b33877ba050ce2092c8e3919bb2a3d964\",\"file_bytes\":1370,\"body_bytes\":344},{\"atom_id\":\"measure-the-number-instead-of-believing-the-stale-document\",\"file_sha256\":\"79f114516ec64a29ec5a14545fb4b2dc9e842145a1e6fa0991e76a206629f624\",\"content_sha256\":\"58581da99e9a1b82d0c02c9439603c8d8d8c9bf3aa1c78bfaf30e27784d62df3\",\"file_bytes\":1581,\"body_bytes\":507},{\"atom_id\":\"state-the-invariant-the-plan-must-satisfy-not-the-edit\",\"file_sha256\":\"e156d9b5505a7f611cc662762e6346879575145dd5f4f126b919a63616d82a2e\",\"content_sha256\":\"e06b0b90887a0998216e42f7031a51de019fd15832c53c8d60e256d9cf93f3b3\",\"file_bytes\":1547,\"body_bytes\":452},{\"atom_id\":\"treat-a-silently-reduced-scope-as-a-blocking-finding\",\"file_sha256\":\"9b382aa5a74217fbf2c86714adb4ef1b50f91061c1153548ec5f991984627f50\",\"content_sha256\":\"cc204bc4878a7730875b6994bf5967e9285f144cef00434c4c3faab1c6124de1\",\"file_bytes\":1418,\"body_bytes\":410},{\"atom_id\":\"verify-the-plan-backwards-from-the-outcome\",\"file_sha256\":\"3c2632d432b4f46ed959e7f2dc810de8b713d4bd5c3aa0aabe5bbfd10eb1acfc\",\"content_sha256\":\"17d62d44c464191156ecc1e372502a5a23443f782b5e77ee28261fb2c7a8f7f2\",\"file_bytes\":1557,\"body_bytes\":535}]"
carrier_sha256: 5ab27dcc3204591d515ab988b4b43b1218298354247bc757a307f8b6f73a5b22
carrier_bytes: 8264
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-plan-set-with-only-advisories-is-not-a-pass -->
---
instruction_id: a-plan-set-with-only-advisories-is-not-a-pass
title: A plan set with only advisories is not a pass
summary: Any finding at all means the plan set is reported as carrying issues; only a plan set with nothing at all is a pass.
capability_tags:
  - plan-implementation
pattern_tags:
  - finding-severity-policy
conditions_applies_when: The overall verdict of a plan review is decided.
conditions_does_not_apply_when: The plan set has no findings.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the verdict
  - the findings by severity
artifact_contract_verified_by: the verdict distinguishes an advisory-only result from a clean one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# A plan set with only advisories is not a pass
passed: All requirements covered, all tasks complete, dependency graph valid, key links planned, scope within budget, must_haves properly derived — and zero issues of any severity.
An advisory-only result is NOT `passed`.
Plans need revision only when Critical or Important issues are present.
<!-- vpmodule:atom:end a-plan-set-with-only-advisories-is-not-a-pass -->
<!-- vpmodule:atom:begin measure-the-number-instead-of-believing-the-stale-document -->
---
instruction_id: measure-the-number-instead-of-believing-the-stale-document
title: Measure the number instead of believing the stale document
summary: A number from an older document is measured again; when it cannot be measured the discrepancy is reported without picking a winner.
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A plan and an earlier document disagree about a number or a fact.
conditions_does_not_apply_when: The two sources agree.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the measurement
  - the discrepancy
artifact_contract_verified_by: the number was measured live or the discrepancy was reported without a prescribed value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Measure the number instead of believing the stale document
RESEARCH.md is produced at research time and may be stale.
Attempt live measurement first with a targeted read-only command (e.g., `find . -name '*.test.*' | wc -l`). Run it. Use the result as ground truth:
NEVER prescribe a specific value by assuming RESEARCH.md is authoritative for a numeric/factual claim.
If live measurement is not possible (external system, future state): report the discrepancy WITHOUT prescribing which value is correct:
<!-- vpmodule:atom:end measure-the-number-instead-of-believing-the-stale-document -->
<!-- vpmodule:atom:begin state-the-invariant-the-plan-must-satisfy-not-the-edit -->
---
instruction_id: state-the-invariant-the-plan-must-satisfy-not-the-edit
title: "State the invariant the plan must satisfy, not the edit"
summary: A finding names the property that has to hold and the evidence that it does not; the suggested route is one example among many.
capability_tags:
  - communicate-concisely
pattern_tags:
  - testable-criteria
conditions_applies_when: A defect in a plan is reported.
conditions_does_not_apply_when: The report is a summary without findings.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the required property
  - the evidence
  - the example route
artifact_contract_verified_by: every finding names the property and the evidence and the route is marked as one example
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# State the invariant the plan must satisfy, not the edit
`required_property` + `description` + `severity` are the binding payload: what must be true, the evidence it is not, and how hard that blocks.
`fix_hint` is **one example** of a route to that property — never the only admissible route, never an instruction.
State it as the invariant, not the edit — "every `auto` task has a `<verify>` separating pass from fail", not "add a verify block".
<!-- vpmodule:atom:end state-the-invariant-the-plan-must-satisfy-not-the-edit -->
<!-- vpmodule:atom:begin treat-a-silently-reduced-scope-as-a-blocking-finding -->
---
instruction_id: treat-a-silently-reduced-scope-as-a-blocking-finding
title: Treat a silently reduced scope as a blocking finding
summary: "A plan that names the decision but delivers a fraction of it is a blocking finding, not a warning."
capability_tags:
  - plan-implementation
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A plan is checked against a decision the user made.
conditions_does_not_apply_when: The plan delivers the decision in full.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the decision
  - the delivered scope
artifact_contract_verified_by: the reduced scope is reported as blocking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Treat a silently reduced scope as a blocking finding
Critical
This is the most insidious failure mode: Plans reference D-XX but deliver only a fraction of what the user decided.
Scope reduction is never a Minor finding — it means the user's decision will not be delivered.
Treating scope reduction ("v1", "static for now", "future enhancement") as acceptable when the user's decision demands full delivery
<!-- vpmodule:atom:end treat-a-silently-reduced-scope-as-a-blocking-finding -->
<!-- vpmodule:atom:begin verify-the-plan-backwards-from-the-outcome -->
---
instruction_id: verify-the-plan-backwards-from-the-outcome
title: Verify the plan backwards from the outcome
summary: The check starts from what has to be true for the goal and asks whether a task makes it true; effort and intent earn nothing.
capability_tags:
  - plan-implementation
pattern_tags:
  - code-review
conditions_applies_when: A plan is checked before it is executed.
conditions_does_not_apply_when: The code that a plan produced is being checked.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the outcome
  - the truths
  - the covering tasks
artifact_contract_verified_by: every truth is traced to a task and the gaps are listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Verify the plan backwards from the outcome
Verify they WILL achieve the phase goal — do not credit effort or intent, only verifiable coverage.
Plan completeness =/= Goal achievement
What must be TRUE for the phase goal to be achieved?
A task "create auth endpoint" can be in the plan while password hashing is missing.
Are artifacts wired together, not just created in isolation?
FAIL the verification if any requirement ID from the roadmap is absent from all plans' `requirements` fields. This is a blocking issue, not a warning.
<!-- vpmodule:atom:end verify-the-plan-backwards-from-the-outcome -->