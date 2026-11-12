---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-add-tests-md-64d98714-c01"
title: "gsd-core: gsd-core/workflows/add-tests.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/add-tests.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/add-tests.md\"}"
atom_ids:
  - classify-each-changed-file-by-test-tier
  - extend-an-existing-test-instead-of-duplicating-it
atom_count: 2
atoms: "[{\"atom_id\":\"classify-each-changed-file-by-test-tier\",\"file_sha256\":\"2581c6ff8501c3755f8f5bea7bf92e02e54219921764b0d8f91212c8773fcf30\",\"content_sha256\":\"67c3bff9d65154714cea6ebb366578de515d976920d3f4fcf39dcf139941e6ad\",\"file_bytes\":3153,\"body_bytes\":1903},{\"atom_id\":\"extend-an-existing-test-instead-of-duplicating-it\",\"file_sha256\":\"c49610cace078f8c9f449ec45a55e1e6790a3f5cd9e29a934d2ce2bfc62b7d31\",\"content_sha256\":\"2ddfe8b45bc710743c4c4ff96a3407bbea7708fdaeba9d9c632e7d96c6d5cb81\",\"file_bytes\":1268,\"body_bytes\":145}]"
carrier_sha256: dcdacf925424ac612682374830685ccd6ad1cf5016fbad6c394cfe93b8318750
carrier_bytes: 4712
revision: 1
status: active
---
<!-- vpmodule:atom:begin classify-each-changed-file-by-test-tier -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-tests.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
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
<!-- vpmodule:atom:end classify-each-changed-file-by-test-tier -->
<!-- vpmodule:atom:begin extend-an-existing-test-instead-of-duplicating-it -->
---
instruction_id: extend-an-existing-test-instead-of-duplicating-it
title: Extend an existing test instead of duplicating it
summary: "Before a test is written, the existing tests for the same scenario are searched; if one covers it, that test is extended rather than a second copy written."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A test is about to be written for a scenario that may already be covered.
conditions_does_not_apply_when: No test exists for the scenario.
artifact_contract_output_type: test-deduplication-record
artifact_contract_required_data:
  - the existing test that covers the scenario
  - the decision to extend it
artifact_contract_verified_by: no second test covers a scenario an existing test already covers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-tests.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Extend an existing test instead of duplicating it
Check for existing tests covering the same scenario:
If found, extend rather than duplicate.
<!-- vpmodule:atom:end extend-an-existing-test-instead-of-duplicating-it -->