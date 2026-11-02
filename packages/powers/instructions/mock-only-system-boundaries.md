---
instruction_id: mock-only-system-boundaries
title: Mock only system boundaries
summary: "Mock at system boundaries such as external APIs, HTTP requests, databases, the file system, time and randomness; never mock your own logic, transformations or validation."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test needs a double for a dependency.
conditions_does_not_apply_when: The dependency is your own module or an internal collaborator.
artifact_contract_output_type: mocking-decision
artifact_contract_required_data:
  - boundary
  - mock
  - real code kept
artifact_contract_verified_by: every double sits at a system boundary and no internal collaborator is mocked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/tdd/mocking.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/testing-patterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=TESTING-STANDARDS.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mock only system boundaries
Mock at **system boundaries** only:
- External APIs (payment, email, etc.)
- HTTP requests
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system operations (sometimes)
Don't mock:
- Your own classes/modules
- Internal collaborators
- Internal utility functions
- Business logic
- Data transformations
- Validation functions
- Pure functions
- Anything you control
Complete mocks.
When mocking a dependency, mock only the dependency — not the SUT behavior itself.
A mock that returns a hardcoded value from inside the function under test is a pass-always test in disguise.
External I/O (filesystem, network, clock) is the appropriate scope for mocking.
Business logic inside the SUT is not mocked; it is exercised.
For crash or rollback behavior, exercise the real boundary: an injected exception is not process termination, and a mocked transaction call is not a database rollback.
