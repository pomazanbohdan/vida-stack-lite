---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-qa-generate-e2e-tests-workflow-md-371cb16b-c02"
title: "bmad-method: skills/bmad-qa-generate-e2e-tests/workflow.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-qa-generate-e2e-tests/workflow.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-qa-generate-e2e-tests/workflow.md\"}"
atom_ids:
  - stay-with-the-frameworks-standard-api-for-the-tests-you-add-now
  - write-one-test-per-scenario-against-the-public-surface
  - write-only-tests-for-behavior-that-already-works
  - write-the-new-tests-in-the-shape-the-project-already-uses
atom_count: 4
atoms: "[{\"atom_id\":\"stay-with-the-frameworks-standard-api-for-the-tests-you-add-now\",\"file_sha256\":\"1ad0be2fa64820c1dd98c735fad895bfbeb6d5cdbd54127152c842d4ab6c4a18\",\"content_sha256\":\"c2065cd2f063f5fcdd0b0f3370fa5d30c1862c5860c79e00f4ee0b90fe25c285\",\"file_bytes\":1364,\"body_bytes\":247},{\"atom_id\":\"write-one-test-per-scenario-against-the-public-surface\",\"file_sha256\":\"65fdcb50bc742b02e0d2676911c908becf064d84326466ff84b1b903423ab90c\",\"content_sha256\":\"d17afcb583c5bf2384853bc1ca019e2853eafa894e4c91590473d25c15df3d33\",\"file_bytes\":1614,\"body_bytes\":536},{\"atom_id\":\"write-only-tests-for-behavior-that-already-works\",\"file_sha256\":\"3dcb8a12508d435e8dd6e8a02aa8a5911f335dd6ae098db0d9fd62a062cdfa3a\",\"content_sha256\":\"ff65b48f004af1dfdf6aa318018a7ffa9104871644a086b967c02ad6bbe854f4\",\"file_bytes\":1574,\"body_bytes\":366},{\"atom_id\":\"write-the-new-tests-in-the-shape-the-project-already-uses\",\"file_sha256\":\"19b9d4f9d74b4f997996ecee77ee2163d09fc433fbf9cd7e6485d4ffd54004a0\",\"content_sha256\":\"ae8aeedb597e794188f0a1a75b20578e79fce55caff46b0aa1129afc62cc532a\",\"file_bytes\":1351,\"body_bytes\":167}]"
carrier_sha256: e0151ff77c9ba541f0a66cd4c545abff6d183ee96518f3b55515535afcc30975
carrier_bytes: 6578
revision: 1
status: active
---
<!-- vpmodule:atom:begin stay-with-the-frameworks-standard-api-for-the-tests-you-add-now -->
---
instruction_id: stay-with-the-frameworks-standard-api-for-the-tests-you-add-now
title: "Stay with the framework's standard API for the tests you add now"
summary: "No new fixture layer, no page-object hierarchy and no utility module for the tests being added."
capability_tags:
  - write-tests-first
pattern_tags:
  - project-conventions-first
conditions_applies_when: Tests are added to an existing project.
conditions_does_not_apply_when: A test framework of its own is being set up as a separate change.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the framework API used
  - the project helpers used
artifact_contract_verified_by: the new tests use the standard API and the existing helpers and add no layer of their own
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

# Stay with the framework's standard API for the tests you add now
Stay with the framework's standard API and the project's existing helpers. Do not build a fixture layer, page-object hierarchy, or utility module for the tests you are adding now.
<!-- vpmodule:atom:end stay-with-the-frameworks-standard-api-for-the-tests-you-add-now -->
<!-- vpmodule:atom:begin write-one-test-per-scenario-against-the-public-surface -->
---
instruction_id: write-one-test-per-scenario-against-the-public-surface
title: "Write one test per scenario, against the public surface"
summary: "One test per scenario, named for the scenario, exercised the way a user or a client does it."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A confirmed scenario list is turned into tests.
conditions_does_not_apply_when: The scenario list was not confirmed yet.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - one test per scenario
  - the visible outcome each test asserts
artifact_contract_verified_by: every test is named for its scenario and reaches the behavior through the UI or the public API
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

# Write one test per scenario, against the public surface
One test per scenario from Phase 1, named for the scenario.
Each test:
- exercises the behavior the way a user or client does: through the UI with locators by role, label, or text, or through the public API, never through internals;
- asserts the visible outcome, not implementation details;
- creates the data it needs and leaves nothing behind that another test could see, so it passes alone and in any order;
- fails for one reason, so the failure names the broken behavior.
<!-- vpmodule:atom:end write-one-test-per-scenario-against-the-public-surface -->
<!-- vpmodule:atom:begin write-only-tests-for-behavior-that-already-works -->
---
instruction_id: write-only-tests-for-behavior-that-already-works
title: Write only tests for behavior that already works
summary: "The change adds coverage for behavior that already works, touches no product code, and lists any harness-only product change."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: End-to-end and API tests are requested for a feature that already behaves as intended.
conditions_does_not_apply_when: The work in flight has no working behavior yet; the build writes those tests.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the covered scenarios
  - the product code touched for the harness
  - the command that runs the new tests
artifact_contract_verified_by: the diff carries tests and no product code beyond what the harness needs
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

# Write only tests for behavior that already works
Add end-to-end and API tests for behavior that already works, so that an agent or a person can change the code and know it still works.
Tests only: no review of the implementation, and no product code changes beyond what the harness needs to reach an element, such as a test id. List any such change in the report.
<!-- vpmodule:atom:end write-only-tests-for-behavior-that-already-works -->
<!-- vpmodule:atom:begin write-the-new-tests-in-the-shape-the-project-already-uses -->
---
instruction_id: write-the-new-tests-in-the-shape-the-project-already-uses
title: Write the new tests in the shape the project already uses
summary: "The new tests reuse the runner, the layout, the fixtures and the app start the project already has."
capability_tags:
  - write-tests-first
pattern_tags:
  - project-conventions-first
conditions_applies_when: New tests are written into a project that already has an end-to-end harness.
conditions_does_not_apply_when: The project has no harness and one is being proposed as a separate change.
artifact_contract_output_type: test-suite
artifact_contract_required_data:
  - the runner used
  - the layout used
  - the fixtures used
  - the way the app is started
artifact_contract_verified_by: "the new tests use the same runner, layout, fixtures and app start as the existing ones"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-qa-generate-e2e-tests/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the new tests in the shape the project already uses
The new tests follow what is there: same runner, same layout, same fixtures, same way of starting the app.
<!-- vpmodule:atom:end write-the-new-tests-in-the-shape-the-project-already-uses -->