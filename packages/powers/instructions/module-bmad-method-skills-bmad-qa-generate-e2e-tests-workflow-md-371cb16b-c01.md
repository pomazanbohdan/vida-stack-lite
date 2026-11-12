---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-qa-generate-e2e-tests-workflow-md-371cb16b-c01"
title: "bmad-method: skills/bmad-qa-generate-e2e-tests/workflow.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-qa-generate-e2e-tests/workflow.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-qa-generate-e2e-tests/workflow.md\"}"
atom_ids:
  - decide-whether-the-test-the-harness-or-the-application-is-wrong
  - find-the-cause-of-a-flaky-test-instead-of-retrying
  - find-the-feature-to-cover-in-a-fixed-order
  - list-the-scenarios-before-touching-the-harness
  - propose-a-missing-harness-as-its-own-change
  - report-the-covered-and-the-uncovered-scenarios
  - run-the-existing-suite-before-adding-to-it
  - run-the-new-tests-twice
atom_count: 8
atoms: "[{\"atom_id\":\"decide-whether-the-test-the-harness-or-the-application-is-wrong\",\"file_sha256\":\"9389f7749ddcd2412443e66e90d29418ecbf7d454b1c19a73d551e017d2105f9\",\"content_sha256\":\"b597421b6ab73786fd22ce38d16b978f6f88ba16613053a6a0a3c86082466ab2\",\"file_bytes\":1680,\"body_bytes\":534},{\"atom_id\":\"find-the-cause-of-a-flaky-test-instead-of-retrying\",\"file_sha256\":\"8ed54f47dbe464e43b0bc4c4dab1c7e2c95de107db0643f187200168aecb83dd\",\"content_sha256\":\"335f18f8da317729b4c7a430235e1966a5569c888738b9a7cc55affaf89650d8\",\"file_bytes\":1258,\"body_bytes\":235},{\"atom_id\":\"find-the-feature-to-cover-in-a-fixed-order\",\"file_sha256\":\"7387d5e50bc711a4e561e51ec49fa0e35b0c9c0eca66f86870ed3c90205d2447\",\"content_sha256\":\"01db00839a1a18d886a28cbfec1dd9e2852d34a757dcb3d48fd7da7c8d178dcd\",\"file_bytes\":1912,\"body_bytes\":861},{\"atom_id\":\"list-the-scenarios-before-touching-the-harness\",\"file_sha256\":\"338afdf18a8ba616c23b501bd669f6f6303bb24afcff504a56729f6c4bc0e36b\",\"content_sha256\":\"44386461935d0f6de14a9f1e60cd52eecbf7a17d7a7d2b195d2940799ac5eaa5\",\"file_bytes\":1889,\"body_bytes\":767},{\"atom_id\":\"propose-a-missing-harness-as-its-own-change\",\"file_sha256\":\"7c226dfcf63f90d2629a3876341857b316762a2304b5f72f80690ec0fd5c0da8\",\"content_sha256\":\"67e5bf79558f1b610e1abecf9b4948bc48f37b2b18d65dedaf89ebec0b9a10c6\",\"file_bytes\":1445,\"body_bytes\":286},{\"atom_id\":\"report-the-covered-and-the-uncovered-scenarios\",\"file_sha256\":\"a5b9d5a85618889def91344ef459d4ed70cbe4e5e2f051388a3b14a8ac124072\",\"content_sha256\":\"57e022a1c88c3ab2bc72dfa5c45a1b41e0a72d31f63e41f49615742cfdf1b97e\",\"file_bytes\":1515,\"body_bytes\":335},{\"atom_id\":\"run-the-existing-suite-before-adding-to-it\",\"file_sha256\":\"2f15d8d2b4dcda6cba751e3a202984ab4e96cc8f097b42560d49efc21f3a6ac2\",\"content_sha256\":\"7b7fe98ed45ac5667f84265c1ad9a5e032ae66d4fa440026e3e0934aaae679a1\",\"file_bytes\":1357,\"body_bytes\":232},{\"atom_id\":\"run-the-new-tests-twice\",\"file_sha256\":\"0a8e99e194e8a55e3b3d3235898005d937eae0bca45d45c63b7cb2828b344a0d\",\"content_sha256\":\"90bd4510efa86758ac876fe0a05ab8e35c724e83d3727458f7337cf3665ce6a5\",\"file_bytes\":1033,\"body_bytes\":74}]"
carrier_sha256: 68d755995e736e7df5e7e36b0b105dda0218ba9081672d491de1c3778023189a
carrier_bytes: 13262
revision: 1
status: active
---
<!-- vpmodule:atom:begin decide-whether-the-test-the-harness-or-the-application-is-wrong -->
---
instruction_id: decide-whether-the-test-the-harness-or-the-application-is-wrong
title: "Decide whether the test, the harness or the application is wrong"
summary: "Every failure is classified first: a wrong test is fixed, a wrong harness is fixed, and a wrong application keeps the test and gets reported."
capability_tags:
  - triage-reports
pattern_tags:
  - test-design
  - report-triage
  - failing-test-policy
conditions_applies_when: The new tests fail.
conditions_does_not_apply_when: No test failed.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - the class of each failure
  - the action taken on it
artifact_contract_verified_by: no assertion was weakened and no product code was changed to make a test pass
compatibility_excludes:
  - never-skip-or-silence-a-failing-test
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Decide whether the test, the harness or the application is wrong
For each failure, decide which it is:
- The test is wrong (locator, setup, or expectation): fix the test.
- The harness is wrong (app not started, data missing, credentials): fix the harness setup.
- The application is wrong: the test found a bug. Keep the test as written, mark it the way the framework marks an expected failure with the bug as the reason, and report it. Never weaken an assertion to make a test pass, and never change product code to make it pass.
<!-- vpmodule:atom:end decide-whether-the-test-the-harness-or-the-application-is-wrong -->
<!-- vpmodule:atom:begin find-the-cause-of-a-flaky-test-instead-of-retrying -->
---
instruction_id: find-the-cause-of-a-flaky-test-instead-of-retrying
title: Find the cause of a flaky test instead of retrying
summary: "A test that passes once and fails once is flaky; find the cause and fix it, never retry it."
capability_tags:
  - write-tests-first
pattern_tags:
  - systematic-debugging
conditions_applies_when: A test passes on one run and fails on the next.
conditions_does_not_apply_when: The test fails the same way on every run.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - the cause of the flakiness
  - the fix applied
artifact_contract_verified_by: the cause is fixed and no retry was added to the test
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Find the cause of a flaky test instead of retrying
A test that passes once and fails once is flaky. Find the cause, usually a check that runs before the app has finished or state shared between tests, and fix it. Do not add retries.
<!-- vpmodule:atom:end find-the-cause-of-a-flaky-test-instead-of-retrying -->
<!-- vpmodule:atom:begin find-the-feature-to-cover-in-a-fixed-order -->
---
instruction_id: find-the-feature-to-cover-in-a-fixed-order
title: Find the feature to cover in a fixed order
summary: "The feature to cover is looked for in a fixed order, and the first source that identifies it wins."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: The feature that the new tests must cover is not yet named.
conditions_does_not_apply_when: The feature is already named in the request.
artifact_contract_output_type: test-scope
artifact_contract_required_data:
  - the source that identified the feature
  - the feature to cover
artifact_contract_verified_by: the search stopped at the first source that named the feature
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Find the feature to cover in a fixed order
Find the feature to cover. Check in this order and stop at the first that identifies it:
- **Request or recent conversation.** The triggering prompt and the conversation before it name the feature, flow, directory, or ticket; act on them, and do not start from a blank slate.
- **The ticket tree.** Otherwise offer the `tickets` rows whose `state` is `review`, `<ref>` and `<title>` each, plus a choice of another target, and HALT for the user's pick. With none, or another target chosen, continue.
- **Current git state.** If HEAD is not on the default branch, confirm that the feature is what this branch changed against the default branch. HALT for the answer.
- **Ask.** HALT and ask the user what to cover, offering to list the features with no end-to-end coverage, ordered by how much a regression would hurt.
<!-- vpmodule:atom:end find-the-feature-to-cover-in-a-fixed-order -->
<!-- vpmodule:atom:begin list-the-scenarios-before-touching-the-harness -->
---
instruction_id: list-the-scenarios-before-touching-the-harness
title: List the scenarios before touching the harness
summary: The scenarios the tests must cover are listed in the words of a product person and confirmed before any test is written.
capability_tags:
  - write-tests-first
pattern_tags:
  - specification-gate
conditions_applies_when: The feature to cover is known and the tests have not been written yet.
conditions_does_not_apply_when: The scenario list was already confirmed in this session.
artifact_contract_output_type: scenario-list
artifact_contract_required_data:
  - the scenarios to cover
  - the scenarios an existing test already covers
artifact_contract_verified_by: the user confirmed the list before the first test was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# List the scenarios before touching the harness
Then list the scenarios the tests must cover, before touching the harness.
For a ticket, read the epic file, and the story file when there is one, first and in full and trust them; the scenarios come from their Requirements and acceptance criteria, the find result's `description` and `verify`, and the plan's I/O & Edge-Case Matrix when the plan exists. Open a companion only where the ticket points at it. Never write to a ticket file, and never run `tickets.py pull` or `tickets.py mark`.
Each scenario is one sentence a product person would recognize: who does what, and what they see.
Mark the scenarios an existing test already covers.
Present the list and HALT for the user's confirmation before writing tests.
<!-- vpmodule:atom:end list-the-scenarios-before-touching-the-harness -->
<!-- vpmodule:atom:begin propose-a-missing-harness-as-its-own-change -->
---
instruction_id: propose-a-missing-harness-as-its-own-change
title: Propose a missing harness as its own change
summary: "A missing end-to-end harness is a separate, confirmed change: the runner, the location and how the app starts under test."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The project has no end-to-end harness and end-to-end tests were requested.
conditions_does_not_apply_when: The project already has an end-to-end harness.
artifact_contract_output_type: harness-proposal
artifact_contract_required_data:
  - the proposed runner
  - where the tests go
  - how the app is started under test
artifact_contract_verified_by: no dependency and no configuration was added before the user confirmed the proposal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Propose a missing harness as its own change
When the project has no end-to-end harness, setting one up is its own change.
Propose the runner, where tests go, and how the app will be started under test, and HALT for the user's confirmation before adding a dependency or configuration.
<!-- vpmodule:atom:end propose-a-missing-harness-as-its-own-change -->
<!-- vpmodule:atom:begin report-the-covered-and-the-uncovered-scenarios -->
---
instruction_id: report-the-covered-and-the-uncovered-scenarios
title: Report the covered and the uncovered scenarios
summary: "The report names the covered scenarios, the uncovered ones and why, the bugs found and the command that runs the tests."
capability_tags:
  - write-tests-first
pattern_tags:
  - output-formatting
conditions_applies_when: The new tests have been written and run.
conditions_does_not_apply_when: The work stops before the tests were written.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - each covered scenario and its test file
  - each uncovered scenario and why
  - the bugs the tests found
  - the command that runs the new tests
artifact_contract_verified_by: "the report names every scenario of the list as covered or uncovered, and no summary file was written"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Report the covered and the uncovered scenarios
In chat:
- each scenario covered, with its test file
- each scenario from Phase 1 left uncovered, and why
- bugs the tests found
- product code touched for the harness, if any
- the command that runs the new tests
Do not write a summary file: the tests and their commit are the record.
<!-- vpmodule:atom:end report-the-covered-and-the-uncovered-scenarios -->
<!-- vpmodule:atom:begin run-the-existing-suite-before-adding-to-it -->
---
instruction_id: run-the-existing-suite-before-adding-to-it
title: Run the existing suite before adding to it
summary: "The existing suite runs once before the new tests land, and a pre-existing failure is reported rather than fixed."
capability_tags:
  - write-tests-first
pattern_tags:
  - verification-before-completion
conditions_applies_when: New tests are about to be added to a suite that already exists.
conditions_does_not_apply_when: No existing suite exists in the project.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the result of the existing suite before the change
  - the findings the pre-existing failure produced
artifact_contract_verified_by: the pre-existing failure is in the report and was not fixed in this change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the existing suite before adding to it
Run the existing end-to-end suite, or the closest subset, once before adding to it.
A suite that does not pass on the current code is a finding for the report, not something to fix here.
<!-- vpmodule:atom:end run-the-existing-suite-before-adding-to-it -->
<!-- vpmodule:atom:begin run-the-new-tests-twice -->
---
instruction_id: run-the-new-tests-twice
title: Run the new tests twice
summary: The new tests run twice; the second run is what shows whether they hold.
capability_tags:
  - write-tests-first
pattern_tags:
  - verification-rerun-policy
conditions_applies_when: The new tests have been written.
conditions_does_not_apply_when: The tests could not be executed at all.
artifact_contract_output_type: test-report
artifact_contract_required_data:
  - the result of the first run
  - the result of the second run
artifact_contract_verified_by: the new tests were run a second time and both results are recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the new tests twice
Run the new tests, then run them a second time.
<!-- vpmodule:atom:end run-the-new-tests-twice -->