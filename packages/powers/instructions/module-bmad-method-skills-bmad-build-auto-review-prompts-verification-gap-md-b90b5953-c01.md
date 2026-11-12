---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-review-prompts-verification-gap-md-b90b5953-c01"
title: "bmad-method: skills/bmad-build-auto/review-prompts/verification-gap.md module"
summary: "Carrier for 7 atomic instructions from bmad-method:skills/bmad-build-auto/review-prompts/verification-gap.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/review-prompts/verification-gap.md\"}"
atom_ids:
  - ask-would-verification-fail-if-the-behavior-broke
  - count-a-test-only-when-it-runs-and-asserts
  - name-the-smallest-regression-the-consumer-would-observe
  - report-the-other-findings-separately
  - require-a-supersession-signal-for-a-missing-adoption-gap
  - screen-each-part-of-the-change-for-behavioral-change
  - trust-a-pre-verified-finding-as-filed
atom_count: 7
atoms: "[{\"atom_id\":\"ask-would-verification-fail-if-the-behavior-broke\",\"file_sha256\":\"a5d4920107d104226ad9a76eb5f7b2913614d7a5a2884a24eb9b65ea16338184\",\"content_sha256\":\"3831eca2f3a9d8eaead2ce56f6be9754e89c72a2595895dd02a03ef53d1bb5a1\",\"file_bytes\":1987,\"body_bytes\":505},{\"atom_id\":\"count-a-test-only-when-it-runs-and-asserts\",\"file_sha256\":\"76f5f996452476c4eed4f906e1263aa3961c0abef0b3893d2dde1bc28c3823e0\",\"content_sha256\":\"e1728ba1ea5b38df1d31aa6c7a4d77b66d0e4908f2282018694870c62d9da4dd\",\"file_bytes\":2572,\"body_bytes\":1036},{\"atom_id\":\"name-the-smallest-regression-the-consumer-would-observe\",\"file_sha256\":\"c62a16587bb124895fbf2150339726f7800a616cac064d1e1166ca0abe4da8dd\",\"content_sha256\":\"c2c930ca24cfb6745c44dacf2d1b7e5273827de2a1476aa4a0924629006b42f5\",\"file_bytes\":2206,\"body_bytes\":679},{\"atom_id\":\"report-the-other-findings-separately\",\"file_sha256\":\"0f4d879686792157b857e4cb2f42e2857dee0104c9462476b9e83cd8e543dfbc\",\"content_sha256\":\"415993414edbb6db16a429076ba9bf5733094c0bf3c88a00b70956c5e5e1c3f5\",\"file_bytes\":2191,\"body_bytes\":581},{\"atom_id\":\"require-a-supersession-signal-for-a-missing-adoption-gap\",\"file_sha256\":\"943ebc44401ea86d508b257ed10bfe7d5ddc548311826128e0ccd1b6efd365c7\",\"content_sha256\":\"a69452267e0c567facc63f088ab4a0e8095b5f22989c1a604f1834c5fd606156\",\"file_bytes\":2023,\"body_bytes\":539},{\"atom_id\":\"screen-each-part-of-the-change-for-behavioral-change\",\"file_sha256\":\"95dd99ab5cf7352cffde098bf9332488c38fd37f2dc787d0ae323f1bca2c46c4\",\"content_sha256\":\"d34ae80e6d168673387c4643d520532bfb5dd688916dfcd420721497056ffb2c\",\"file_bytes\":2198,\"body_bytes\":739},{\"atom_id\":\"trust-a-pre-verified-finding-as-filed\",\"file_sha256\":\"b4421436f0f6917156ede146945dff380f5aa132c39358c636f3bf223c4af828\",\"content_sha256\":\"41f6d103e81b45e96da750cc763954ba4fbdfb4ab8c60ecc73058146abb44404\",\"file_bytes\":2309,\"body_bytes\":606}]"
carrier_sha256: 5fa877296a8737fc9a146700bd40d3475eff07533121e7836937ef59dc43fa29
carrier_bytes: 16545
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-would-verification-fail-if-the-behavior-broke -->
---
instruction_id: ask-would-verification-fail-if-the-behavior-broke
title: Ask whether verification would fail if the behavior broke
summary: "One question drives the gap analysis: if this behavior broke where it is used, would any test fail? A gap is filed only as a request to add or change one test."
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A change is checked for the behavior that could break unnoticed.
conditions_does_not_apply_when: The review is hunting correctness bugs.
artifact_contract_output_type: verification-gap-findings
artifact_contract_required_data:
  - the changed behavior
  - the consumer
  - the evidence that no test would fail
artifact_contract_verified_by: each finding answers the one question with the evidence that was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask whether verification would fail if the behavior broke
Find changed behavior that could break later without any test failing.
Ask one question — "if this behavior broke where it is actually used, would any test fail?"
A gap finding is a request to add or change one test. File it only when you can name a specific regression that test would catch; if no such test is worth writing, there is nothing to file.
Do not hunt for correctness bugs; report the genuine problems you run into while tracing.
<!-- vpmodule:atom:end ask-would-verification-fail-if-the-behavior-broke -->
<!-- vpmodule:atom:begin count-a-test-only-when-it-runs-and-asserts -->
---
instruction_id: count-a-test-only-when-it-runs-and-asserts
title: Count a test only when it runs and asserts
summary: "A test counts as verification only when it runs normally and an assertion observes the changed output, branch or contract; a stale test is itself a gap."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A candidate test is weighed against the changed behavior.
conditions_does_not_apply_when: No test was found for the behavior.
artifact_contract_output_type: test-weighting
artifact_contract_required_data:
  - the test
  - whether it runs
  - what its assertion observes
artifact_contract_verified_by: a test was counted only when it runs and asserts the changed behaviour
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Count a test only when it runs and asserts
A test counts only if it runs normally and an assertion observes the changed output, branch, or contract.
These do not count: no execution; source-text assertions that match a file's wording instead of running it; success/no-throw/snapshot-only checks; mock/log-call checks; human-only checks; tests that mock away the integration; e2e tests that pass through without checking the changed output; stale assertions or fixtures.
A test this change made wrong or moot is itself a stale-verification gap, not merely excluded: say what it should assert instead, or that it should go.
For example, `expect(x ?? DEFAULT).toBe(DEFAULT)` passes when `x` is missing.
A test that passes regardless of whether the feature it describes is implemented is worse than no test: it inflates the count while providing false confidence.
The test must be capable of failing if the feature is absent or broken.
Write the test first (red phase of TDD), confirm it fails with a stub implementation, then implement.
<!-- vpmodule:atom:end count-a-test-only-when-it-runs-and-asserts -->
<!-- vpmodule:atom:begin name-the-smallest-regression-the-consumer-would-observe -->
---
instruction_id: name-the-smallest-regression-the-consumer-would-observe
title: Name the smallest regression the consumer would observe
summary: Every consumer is qualified by the smallest realistic regression it would show; 'this line could be removed without a test failing' is not a regression, and a consumer with no such regression is dropped.
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A changed behavior was traced to the places that observe it.
conditions_does_not_apply_when: No consumer of the changed behavior was found.
artifact_contract_output_type: consumer-qualification
artifact_contract_required_data:
  - the consumer
  - the smallest regression it would observe
  - the demonstration
artifact_contract_verified_by: every reported consumer has a concrete regression it would show
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the smallest regression the consumer would observe
For each consumer, name the smallest realistic regression this consumer would observe: invert the branch, drop the default, omit the field, return the old error code, skip the integration call, etc. This is the Demonstration; it describes what goes wrong for the consumer.
"This line could be removed without a test failing" is not a regression.
If there is no regression — the state is unreachable, the branch is defensive, or the code repeats what another line already guarantees — drop the path; there is no finding and nowhere else to file it.
Untested downstream code the change did not affect is not a finding.
<!-- vpmodule:atom:end name-the-smallest-regression-the-consumer-would-observe -->
<!-- vpmodule:atom:begin report-the-other-findings-separately -->
---
instruction_id: report-the-other-findings-separately
title: Report the other findings separately
summary: "A real defect noticed while tracing verification is reported apart from the gaps, so it still goes through the normal triage."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Tracing verification turned up a problem that is not a verification gap.
conditions_does_not_apply_when: Only verification gaps were found.
artifact_contract_output_type: other-findings
artifact_contract_required_data:
  - the problems noticed
  - where they were noticed
artifact_contract_verified_by: the non-gap problems are listed apart from the gaps
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-security-auditor.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report the other findings separately
Report genuine problems you noticed while tracing verification, even if they are not verification gaps. Put them under `Other findings` in the output.
This permits reporting what you already reached, not extra hunting.
A claim that code misbehaves is a defect, not a gap — it goes under `Other findings` for standard triage, however you found it.

For each `threat_flag` in SUMMARY.md `## Threat Flags`: if maps to existing threat ID → informational. If no mapping → log as `unregistered_flag` in the structured return (not a blocker).
<!-- vpmodule:atom:end report-the-other-findings-separately -->
<!-- vpmodule:atom:begin require-a-supersession-signal-for-a-missing-adoption-gap -->
---
instruction_id: require-a-supersession-signal-for-a-missing-adoption-gap
title: Require a supersession signal for a missing-adoption gap
summary: A place that still handles a case the old way is only a gap when the change clearly replaces the old behaviour and the site shares the same observable contract.
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A site that still handles a case its own way is proposed as a finding.
conditions_does_not_apply_when: The site already uses the new behaviour.
artifact_contract_output_type: adoption-qualification
artifact_contract_required_data:
  - the site
  - the supersession signal
  - the shared observable contract
artifact_contract_verified_by: the finding names the supersession signal and the shared contract
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Require a supersession signal for a missing-adoption gap
A `Missing-adoption gap` qualifies not by the adoption failure alone but by a supersession signal: the change gives clear evidence the new behavior is meant to replace the local one — PR intent, naming or docs, a replaced sibling site, deleted duplicate logic, or a test defining the new rule — and the local site shares the same observable contract.
Without a supersession signal and a shared observable contract, it is a refactor suggestion, not a verification-gap finding.
<!-- vpmodule:atom:end require-a-supersession-signal-for-a-missing-adoption-gap -->
<!-- vpmodule:atom:begin screen-each-part-of-the-change-for-behavioral-change -->
---
instruction_id: screen-each-part-of-the-change-for-behavioral-change
title: Screen each part of the change for behavioral change
summary: "Each part of the change is screened on its own; a part counts as non-behavioral only when it alters no return value, error, side effect or observable state, and a test-only part is never skipped."
capability_tags:
  - review-code
pattern_tags:
  - verification-before-completion
conditions_applies_when: A change is screened before its behavior is traced.
conditions_does_not_apply_when: The change is a single part.
artifact_contract_output_type: behavioral-screen
artifact_contract_required_data:
  - the parts
  - the behavioral parts
  - the parts that were skipped
artifact_contract_verified_by: every part was screened against the behavioural test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Screen each part of the change for behavioral change
Screen each part of the change separately. If a part is non-behavioral, skip it.
Call a part non-behavioral only when the changed code does not alter return values, thrown errors, caller-visible side effects, or observable state (including iteration order and emitted messages).
Once a part meets that test, move on; do not inspect its callers or tests for extra confirmation.
Common non-behavioral examples: formatting, comments, whitespace; pure renames; trivial getters/setters and pass-throughs; type-only or compiler-enforced changes with no runtime effect; etc.
Do not skip test-only parts: a deleted or weakened test is checked as verification, and every touched test is read.
<!-- vpmodule:atom:end screen-each-part-of-the-change-for-behavioral-change -->
<!-- vpmodule:atom:begin trust-a-pre-verified-finding-as-filed -->
---
instruction_id: trust-a-pre-verified-finding-as-filed
title: Trust a pre-verified finding as filed
summary: A finding from a lane whose evidence rules already made it read the tests and run the searches it cites is taken as filed; the finding has to stand on its own evidence.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A finding comes from a lane that already verified it against the code and the tests.
conditions_does_not_apply_when: The finding was not verified by the lane that produced it.
artifact_contract_output_type: pre-verified-finding
artifact_contract_required_data:
  - the finding as filed
  - the verdict from the filed evidence
  - the disposition it carries
artifact_contract_verified_by: "the finding was accepted from the filed evidence without a second verification, and its Other findings were graded normally"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/review-prompts/verification-gap.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/review-prompts/verification-gap.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Trust a pre-verified finding as filed
A gap finding from the verification-gap lens arrives pre-verified — that lens's evidence rules made it read the tests and run the searches it cites, and triage trusts the claim as filed.
Skip verification. In code-review triage the gap finding is `Important` and needs no grading; in build review, render the verdict from the filed evidence and weigh its filed disposition when routing.
Its `Other findings` are verified and graded like everything else.
Triage trusts a gap finding as filed and does not re-verify it, so each block must stand on its own evidence.
<!-- vpmodule:atom:end trust-a-pre-verified-finding-as-filed -->