---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-working-with-legacy-code-skill-md-14390601-c01"
title: "wondelai-skills: skills/working-with-legacy-code/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/working-with-legacy-code/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/working-with-legacy-code/SKILL.md\"}"
atom_ids:
  - legacy-code-break-dependencies
  - legacy-code-change-algorithm
  - legacy-code-characterization-tests
  - legacy-code-common-mistakes
  - legacy-code-diagnostic
  - legacy-code-find-seams
  - legacy-code-score-change-readiness
  - legacy-code-sprout-and-wrap
atom_count: 8
atoms: "[{\"atom_id\":\"legacy-code-break-dependencies\",\"file_sha256\":\"e8ed3e68ec903167ff19a21f1cdb73a39996b2e1e8b608f33e0e56e5afb22013\",\"content_sha256\":\"e9a3afb0902d9ec515089039c168b9051f5f679c454634d6c292d5fef797132d\",\"file_bytes\":1659,\"body_bytes\":449},{\"atom_id\":\"legacy-code-change-algorithm\",\"file_sha256\":\"1b995890560f20302a08dcb1b1af10b5f2bdb9910c48d624969493eea0d32936\",\"content_sha256\":\"27e2acf81297dab379ea8a937bcdbfdee008e309d8df3b4f1eb269a11fda6d1a\",\"file_bytes\":1617,\"body_bytes\":445},{\"atom_id\":\"legacy-code-characterization-tests\",\"file_sha256\":\"bc36744a0420bb70cbe8a7bf6bacd569621d14c3ea813332c85f4ae2c5548882\",\"content_sha256\":\"31604033e8813d1476a02dc794bd08a7b0f0e1fd5904779ed5c81377fa46ce40\",\"file_bytes\":1672,\"body_bytes\":468},{\"atom_id\":\"legacy-code-common-mistakes\",\"file_sha256\":\"f3d295ab608dc57fd770fca8d0aa346258d74163992c0be5dddfa119d2354e4f\",\"content_sha256\":\"57f2267f33a2a2133a75013d63a70bf1c0bf42ff19cb494107b75c0f6e91cba6\",\"file_bytes\":1483,\"body_bytes\":336},{\"atom_id\":\"legacy-code-diagnostic\",\"file_sha256\":\"8afe2fe450bf3bbf1e647b43afb2e040000f424ccee6d2bfcb8266c1b9c97576\",\"content_sha256\":\"6b46cf9eb274c8854567474a623daaa547833200d6a47443ad7354d6419aeaec\",\"file_bytes\":1433,\"body_bytes\":287},{\"atom_id\":\"legacy-code-find-seams\",\"file_sha256\":\"35c4cdfda3d72b82b28d2ea9273851bd6f9794620fae0fac895d2e2a6b58389b\",\"content_sha256\":\"156c02888714e38460a2b5cddbcebcbaf12dbb84b755f6ff281ded2ef71b7930\",\"file_bytes\":1562,\"body_bytes\":431},{\"atom_id\":\"legacy-code-score-change-readiness\",\"file_sha256\":\"431c5c44d6734414f42cb35b1a3a66fc5173498c486cc99c151b895f7ed61f81\",\"content_sha256\":\"09641b0150461570bb311422b11e6d68df48b2709e72a778cf0b3c32c10c9857\",\"file_bytes\":1544,\"body_bytes\":326},{\"atom_id\":\"legacy-code-sprout-and-wrap\",\"file_sha256\":\"b500e8ab3fd40d8f57a2482cc9a265da5cd6d2079ba3cce41ac241b1f744fc4f\",\"content_sha256\":\"fdb4a13e3e7f03f0cd16c3e120bbd278a36c50517385a8a9bdbf73f6ba834fe8\",\"file_bytes\":1783,\"body_bytes\":586}]"
carrier_sha256: ec51c2f26adbd3410b38714181cc62e976da5ee544901220c8d503af2cc308ea
carrier_bytes: 13664
revision: 1
status: active
---
<!-- vpmodule:atom:begin legacy-code-break-dependencies -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-break-dependencies
title: Use the least invasive dependency-breaking technique
summary: "Choose interface extraction, parameterization, override, delegation or adaptation that unblocks instantiation or sensing before tests exist."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A dependency blocks testing of existing behavior.
conditions_does_not_apply_when: A dependency change that alters observable behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The chosen technique is the least invasive one that makes the behavior testable, and existing callers keep working."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L123-L146"
status: active
revision: 1
---

# Use the least invasive dependency-breaking technique

Use the least invasive dependency-breaking technique that unblocks instantiation or sensing before tests exist. The source lists interface extraction, parameterization, factory/getter override, instance delegation, parameter adaptation, method objects, and subclass override; production defaults can preserve existing callers, and dynamic-language seams may substitute for several techniques.
<!-- vpmodule:atom:end legacy-code-break-dependencies -->
<!-- vpmodule:atom:begin legacy-code-change-algorithm -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-change-algorithm
title: Follow the legacy change algorithm
summary: "Identify change points and test points, break dependencies conservatively, write tests, then change and refactor with separate verification."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: Making a behavior change in untested code.
conditions_does_not_apply_when: A change already covered by trustworthy tests.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each step is verified separately, behavior and structure changes are separated, and tests cover the changed paths."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L30-L52"
status: active
revision: 1
---

# Follow the legacy change algorithm

For a change in untested code, identify change points, find test points, break dependencies, write tests, then change and refactor. Keep pre-test dependency edits conservative and mechanical; preserve signatures exactly and use compiler feedback to find affected sites. Verify each step separately, test where effects surface, and grow coverage along changed paths; separate behavior and structure changes.
<!-- vpmodule:atom:end legacy-code-change-algorithm -->
<!-- vpmodule:atom:begin legacy-code-characterization-tests -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-characterization-tests
title: Pin actual behavior with characterization tests
summary: "Probe what the code actually does, pin the observed value, use golden masters for complex output, and characterize the paths the change will touch."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: Adding tests to existing behavior that has no specification.
conditions_does_not_apply_when: A behavior already specified by an authoritative test.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The test asserts observed behavior rather than an imagined requirement, and volatile data is normalized."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L77-L100"
status: active
revision: 1
---

# Pin actual behavior with characterization tests

Characterization tests pin what code actually does, not what a specification or expectation says. Probe behavior, inspect the failure, and pin the observed value; use golden masters for complex outputs and review snapshots while normalizing volatile data. Characterize paths the change will touch. Pin bugs found during characterization with a comment and ticket, then fix them later as a separate deliberate change.
<!-- vpmodule:atom:end legacy-code-characterization-tests -->
<!-- vpmodule:atom:begin legacy-code-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-common-mistakes
title: Avoid common legacy-code mistakes
summary: "Avoid mixing refactoring with behavior changes, imagined-requirement tests, excessive mocking, big-bang rewrites, silent bug fixes, invasive cleanup and untracked sprouts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a change to legacy code for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L171-L183"
status: active
revision: 1
---

# Avoid common legacy-code mistakes

Avoid mixing refactoring with behavior changes, writing tests from imagined requirements, excessive mocking, big-bang rewrites, silently fixing characterized bugs, invasive pre-test cleanup, untracked sprouts, and waiting for a separate testing project; apply each row's stated corrective practice.
<!-- vpmodule:atom:end legacy-code-common-mistakes -->
<!-- vpmodule:atom:begin legacy-code-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-diagnostic
title: Run the legacy-code diagnostic
summary: "Check change coverage, harness construction, sensing, separation of behavior and structure changes, impact, observed assertions, seam cost and coverage growth."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review before changing legacy code.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L184-L196"
status: active
revision: 1
---

# Run the legacy-code diagnostic

Use the diagnostic questions to check change coverage, test-harness construction, sensing, separation of behavior and structure changes, change impact, observed assertions, seam cost, and coverage growth; perform the matching action when a check fails.
<!-- vpmodule:atom:end legacy-code-diagnostic -->
<!-- vpmodule:atom:begin legacy-code-find-seams -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-find-seams
title: Find a seam and its enabling point
summary: "Locate a reachable place where behavior can be substituted without editing production code, and identify where the choice is made."
capability_tags:
  - design-structure
pattern_tags:
  - test-placement-strategy
conditions_applies_when: Code cannot be instantiated or sensed by a test.
conditions_does_not_apply_when: A seam the test cannot reach or control.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The test substitutes behavior at a reachable seam and the production location is unchanged.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L53-L76"
status: active
revision: 1
---

# Find a seam and its enabling point

Find a seam where behavior can be substituted without editing the production location, and identify its enabling point where the behavior choice is made. Prefer reachable seams; a seam the test cannot control is not useful. Object, link/import, and preprocessing seams are described, with preprocessing identified as the last resort; dynamic-language patching can couple tests to file layout.
<!-- vpmodule:atom:end legacy-code-find-seams -->
<!-- vpmodule:atom:begin legacy-code-score-change-readiness -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-score-change-readiness
title: Rate change readiness for untested code
summary: "Score readiness from 0 to 10 against test coverage, separation of behavior and refactoring, dependency intervention and failure modes, and report steps to reach 10."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing how safely a change can be made to untested code.
conditions_does_not_apply_when: A code review that does not assess test coverage or change safety.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - steps
artifact_contract_verified_by: The report states the current score and the steps required to reach 10/10.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L18-L27"
status: active
revision: 1
---

# Rate change readiness for untested code

Rate changes to untested code from 0 to 10 against the stated principles and report the current score and steps required to reach 10/10. The score bands describe test coverage before edits, separation of behavior changes from refactoring, dependency intervention, and failure modes.
<!-- vpmodule:atom:end legacy-code-score-change-readiness -->
<!-- vpmodule:atom:begin legacy-code-sprout-and-wrap -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-sprout-and-wrap
title: Sprout or wrap new behavior when the host cannot be tested
summary: "Keep new behavior out of the untested mass, connect it through one legacy call site, and track sprout debt for later coverage."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: New behavior must be added to code that cannot be tested today.
conditions_does_not_apply_when: A host that can be covered by characterization tests.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: New behavior is tested in isolation and the legacy connection is one explicit call site with tracked debt.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L101-L122"
status: active
revision: 1
---

# Sprout or wrap new behavior when the host cannot be tested

When the affected area genuinely cannot be tested today, keep new behavior out of the untested mass: test fresh sprouted code and connect it through one legacy call site, or wrap old behavior with a new method/class. Use Sprout Method for one insertion point, Sprout Class when the host cannot be instantiated, Wrap Method for surrounding behavior, and Wrap Class for several call sites or a bloated class. Track sprout debt and cover the host on a later change; sprouting is tactical, not a permanent substitute for tests.
<!-- vpmodule:atom:end legacy-code-sprout-and-wrap -->