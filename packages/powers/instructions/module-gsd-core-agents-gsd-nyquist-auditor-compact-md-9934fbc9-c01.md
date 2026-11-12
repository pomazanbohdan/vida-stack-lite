---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-nyquist-auditor-compact-md-9934fbc9-c01"
title: "gsd-core: agents/gsd-nyquist-auditor.compact.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:agents/gsd-nyquist-auditor.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-nyquist-auditor.compact.md\"}"
atom_ids:
  - a-skipped-gap-is-an-unverified-requirement-not-a-resolved-one
  - escalate-an-implementation-bug-instead-of-weakening-the-assertion
  - stop-after-three-debug-iterations-and-escalate
atom_count: 3
atoms: "[{\"atom_id\":\"a-skipped-gap-is-an-unverified-requirement-not-a-resolved-one\",\"file_sha256\":\"f6c44ce6f21ceca4a0def257ccb999bce1a1d394bbcabca23d376ef3bf0ed804\",\"content_sha256\":\"9148e4997299f722ca23f491e3789f5a6105c9cbb2f365a5a6ae0b76b7a7a561\",\"file_bytes\":1409,\"body_bytes\":312},{\"atom_id\":\"escalate-an-implementation-bug-instead-of-weakening-the-assertion\",\"file_sha256\":\"e4608a4acd62a4b5d74e7e877e5bb68f7fcf3976ce4e509f1c772e06aa48902a\",\"content_sha256\":\"b99c2c852480472c84098c27a4bfa3ec2321f710ad0cfae75d93f90c079321dc\",\"file_bytes\":1533,\"body_bytes\":356},{\"atom_id\":\"stop-after-three-debug-iterations-and-escalate\",\"file_sha256\":\"e3d2518c1bd6d979e71505883af6c5a8bca251b0c3fddf10722f9d3618f6c1ab\",\"content_sha256\":\"f995a55d534fa381dfc4a23154c937f36d802cde4361ba69afd541737d59d50a\",\"file_bytes\":1331,\"body_bytes\":219}]"
carrier_sha256: 09161ce54746ddde8ba8676afc9ce8b49590a617e224c20924a0ad18ed9c80ac
carrier_bytes: 4790
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-skipped-gap-is-an-unverified-requirement-not-a-resolved-one -->
---
instruction_id: a-skipped-gap-is-an-unverified-requirement-not-a-resolved-one
title: "A skipped gap is an unverified requirement, not a resolved one"
summary: A gap counts as filled only when a test actually ran and passed.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The coverage of a requirement is decided.
conditions_does_not_apply_when: The test ran and passed.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the gap
  - its status
artifact_contract_verified_by: no gap is reported as filled without a test that ran and passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-nyquist-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-nyquist-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# A skipped gap is an unverified requirement, not a resolved one
Marking gaps as SKIP without escalating — a skipped gap is an unverified requirement, not a resolved one
Run every test. Never mark untested tests as passing.
Treating "test file created" as "gap filled" before the test actually runs and passes
<!-- vpmodule:atom:end a-skipped-gap-is-an-unverified-requirement-not-a-resolved-one -->
<!-- vpmodule:atom:begin escalate-an-implementation-bug-instead-of-weakening-the-assertion -->
---
instruction_id: escalate-an-implementation-bug-instead-of-weakening-the-assertion
title: Escalate an implementation bug instead of weakening the assertion
summary: The implementation is not touched; a test that shows the code violates the requirement is escalated.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A newly written test fails because the implementation is wrong.
conditions_does_not_apply_when: The test itself is wrong.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the failing test
  - the escalated requirement
artifact_contract_verified_by: the implementation was not modified and the gap was escalated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-nyquist-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-nyquist-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Escalate an implementation bug instead of weakening the assertion
Implementation files are READ-ONLY. Only create/modify: test files, fixtures, VALIDATION.md. Implementation bugs → ESCALATE. Never fix implementation.
IMPLEMENTATION BUG → ESCALATE
Debugging a failing test by weakening the assertion rather than fixing the implementation via ESCALATE
<!-- vpmodule:atom:end escalate-an-implementation-bug-instead-of-weakening-the-assertion -->
<!-- vpmodule:atom:begin stop-after-three-debug-iterations-and-escalate -->
---
instruction_id: stop-after-three-debug-iterations-and-escalate
title: Stop after three debug iterations and escalate
summary: A failing test gets three attempts and then the requirement is escalated with the expected and the actual behaviour.
capability_tags:
  - debug-root-cause
pattern_tags:
  - resource-bounds
conditions_applies_when: A test keeps failing.
conditions_does_not_apply_when: The test passed.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the iterations
  - the expected and the actual behaviour
artifact_contract_verified_by: the escalation happened at or before the third iteration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-nyquist-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-nyquist-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop after three debug iterations and escalate
Max 3 iterations per failing test.
After 3 failed iterations: ESCALATE with requirement, expected vs actual behavior, impl file reference.
Max 3 debug iterations per gap
<!-- vpmodule:atom:end stop-after-three-debug-iterations-and-escalate -->