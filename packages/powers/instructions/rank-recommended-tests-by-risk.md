---
instruction_id: rank-recommended-tests-by-risk
title: Rank the recommended tests by what they protect
summary: "Rank the tests you recommend by what they protect: data loss and security first, core logic next, edge cases and utilities last."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A coverage analysis recommends tests that have not been written yet.
conditions_does_not_apply_when: The recommended tests have already been written and ranked.
artifact_contract_output_type: ranked-test-recommendations
artifact_contract_required_data:
  - coverage gaps
  - recommended tests
  - priority per test
artifact_contract_verified_by: "every recommended test names what it verifies, why it matters and its priority"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Rank the recommended tests by what they protect
Recommended Tests
1. **[Test name]** — [What it verifies, why it matters]

### Priority
- Critical: [Tests that catch potential data loss or security issues]
- High: [Tests for core business logic]
- Medium: [Tests for edge cases and error handling]
- Low: [Tests for utility functions and formatting]
