---
instruction_id: query-elements-by-role-not-test-id
title: "Query elements by role and label, not by test id"
summary: "An element is located by its accessible role and name, so the test survives a change of the internal markup."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test drives a user interface.
conditions_does_not_apply_when: The test touches no user interface.
artifact_contract_output_type: element-query-review
artifact_contract_required_data:
  - the element
  - the role and accessible name used to find it
artifact_contract_verified_by: no element is located by a test id or by a generated class
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/testing-patterns.md
status: active
revision: 1
---

# Query elements by role and label, not by test id
Find elements by accessible role/label (not test IDs)
```
await screen.findByRole('textbox', { name: /title/i });
await page.getByRole('button', { name: /log in/i }).click();
```
