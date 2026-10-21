---
instruction_id: classify-each-changed-file-by-test-tier
title: Classify each changed file by test tier
summary: "Every changed file is classified as unit, end-to-end or skip, the file is read to confirm the class, and the classification is put to the user before any test is written."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-placement-strategy
conditions_applies_when: Tests are to be written for a set of changed files.
conditions_does_not_apply_when: The files to be tested are already classified.
artifact_contract_output_type: test-tier-classification
artifact_contract_required_data:
  - the class of each file
  - the reason for the class
  - the confirmation of the user
artifact_contract_verified_by: every changed file carries a class that was confirmed by reading the file and the classification was presented to the user and approved before any test was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-tests.md
status: active
revision: 2
---

# Classify each changed file by test tier
For each file, classify into one of three categories:
TDD
E2E
Skip
Pure functions where `expect(fn(input)).toBe(output)` is writable
UI behavior verifiable by browser automation
Not meaningfully testable or already covered
TDD classification - apply when:
Business logic: calculations, pricing, tax rules, validation
Data transformations: mapping, filtering, aggregation, formatting
Parsers: CSV, JSON, XML, custom format parsing
Validators: input validation, schema validation, business rules
State machines: status transitions, workflow steps
Utilities: string manipulation, date handling, number formatting
E2E classification - apply when:
Keyboard shortcuts: key bindings, modifier keys, chord sequences
Navigation: page transitions, routing, breadcrumbs, back/forward
Form interactions: submit, validation errors, field focus, autocomplete
Selection: row selection, multi-select, shift-click ranges
Drag and drop: reordering, moving between containers
Modal dialogs: open, close, confirm, cancel
Data grids: sorting, filtering, inline editing, column resize
Skip classification - apply when:
UI layout/styling: CSS classes, visual appearance, responsive breakpoints
Configuration: config files, environment variables, feature flags
Glue code: dependency injection setup, middleware registration, routing tables
Migrations: database migrations, schema changes
Simple CRUD: basic create/read/update/delete with no business logic
Type definitions: records, DTOs, interfaces with no logic
Read each file to verify classification. Don't classify based on filename alone.
Present the classification to the user for confirmation before proceeding:
- "Approve and generate test plan"
- "Adjust classification (I'll specify changes)"
- "Cancel"
If user selects "Adjust classification": apply their changes and re-present.
If user selects "Cancel": exit gracefully.
