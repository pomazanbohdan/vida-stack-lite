---
instruction_id: mock-only-system-boundaries
title: Mock only system boundaries
summary: "Mock only at system boundaries such as external APIs, databases, time and randomness; never mock your own code."
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
status: active
revision: 1
---

# Mock only system boundaries
Mock at **system boundaries** only:
- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system (sometimes)
Don't mock:
- Your own classes/modules
- Internal collaborators
- Anything you control
