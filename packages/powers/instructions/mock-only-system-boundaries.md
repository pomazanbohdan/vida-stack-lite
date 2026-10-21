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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/mocking.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/testing-patterns.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 3
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
