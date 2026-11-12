---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-validate-phase-md-fdf2edb7-c01"
title: "gsd-core: gsd-core/workflows/validate-phase.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/validate-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/validate-phase.md\"}"
atom_ids:
  - constrain-the-filler-to-the-tests
  - present-the-gap-plan-before-you-generate-the-tests
atom_count: 2
atoms: "[{\"atom_id\":\"constrain-the-filler-to-the-tests\",\"file_sha256\":\"e9e4bc39a6f7e5b94a92020c52ebbf42b400c3b2b693af5a6a49788cf25723d6\",\"content_sha256\":\"08b6a28d70423c519a52de0a8cc2c67be3deb4907378f6a96cade6486618ec81\",\"file_bytes\":1388,\"body_bytes\":259},{\"atom_id\":\"present-the-gap-plan-before-you-generate-the-tests\",\"file_sha256\":\"624bbde32bac0d376899f7d92d64f4a010e9d1b3f8608ebfba555aa47d07af84\",\"content_sha256\":\"bb9e37ce736037d9e879241fff043691b4154d368328ad524ed220542aa548d8\",\"file_bytes\":1204,\"body_bytes\":163}]"
carrier_sha256: 6dfb822acac03403ba38cb4f9948d4c3e02a3720be8ddfdcbcd05d42f8cd3d2f
carrier_bytes: 2873
revision: 1
status: active
---
<!-- vpmodule:atom:begin constrain-the-filler-to-the-tests -->
---
instruction_id: constrain-the-filler-to-the-tests
title: Constrain the filler to the tests
summary: "The worker that fills the gaps may only write tests; it never touches the implementation, it stops after a few debug rounds and escalates what it cannot fix."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-placement-strategy
conditions_applies_when: A worker is asked to write the missing tests.
conditions_does_not_apply_when: The worker is also allowed to fix the implementation.
artifact_contract_output_type: filled-gaps
artifact_contract_required_data:
  - the gaps that were filled
  - the gaps that were escalated
  - the constraint the worker ran under
artifact_contract_verified_by: no implementation file was changed and everything unresolved was escalated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/validate-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Constrain the filler to the tests
Never modify impl files. Max 3 debug iterations. Escalate impl bugs.
`## GAPS FILLED` → record tests + map updates
`## PARTIAL` → record resolved, move escalated to manual-only
`## ESCALATE` → move all to manual-only
<!-- vpmodule:atom:end constrain-the-filler-to-the-tests -->
<!-- vpmodule:atom:begin present-the-gap-plan-before-you-generate-the-tests -->
---
instruction_id: present-the-gap-plan-before-you-generate-the-tests
title: Present the gap plan before you generate the tests
summary: "The gaps are shown as a table with the ways forward, and the person picks before any test is written."
capability_tags:
  - triage-reports
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A set of verification gaps was found and the work could fill them.
conditions_does_not_apply_when: There are no gaps.
artifact_contract_output_type: gap-plan
artifact_contract_required_data:
  - the gaps
  - the options
  - the choice
artifact_contract_verified_by: the gap table was shown and the choice was made before any test was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/validate-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Present the gap plan before you generate the tests
Call AskUserQuestion with gap table and options:
"Fix all gaps"
"Skip — mark manual-only"
"Cancel" → exit
<!-- vpmodule:atom:end present-the-gap-plan-before-you-generate-the-tests -->