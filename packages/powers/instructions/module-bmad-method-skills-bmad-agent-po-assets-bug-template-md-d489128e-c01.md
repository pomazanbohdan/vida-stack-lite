---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-assets-bug-template-md-d489128e-c01"
title: "bmad-method: skills/bmad-agent-po/assets/bug-template.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-agent-po/assets/bug-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/assets/bug-template.md\"}"
atom_ids:
  - state-the-severity-of-the-defect
  - write-a-bug-with-a-reproduction-and-a-cause-hypothesis
atom_count: 2
atoms: "[{\"atom_id\":\"state-the-severity-of-the-defect\",\"file_sha256\":\"49e6b828144ddaa4fc37eec35e8e57dee64a4f9149c529cb9211071ffb90c4f9\",\"content_sha256\":\"189cc9c8f8ff2405af13365451bed4522327ee0ae24dcc55c987054f2613c101\",\"file_bytes\":1557,\"body_bytes\":433},{\"atom_id\":\"write-a-bug-with-a-reproduction-and-a-cause-hypothesis\",\"file_sha256\":\"2bef89dd3be0cccdd22356bc4df6185dbdf1e3cc7581a76641ca0096a093861a\",\"content_sha256\":\"1ad887ad954229069d39e5607bc105285c1679a28434958dd4e8305bd695fd54\",\"file_bytes\":1946,\"body_bytes\":585}]"
carrier_sha256: d124bf361dbe6e8acf5bdb15ff1c31ad7e92c83da73b3030d1555425b5331086
carrier_bytes: 3790
revision: 1
status: active
---
<!-- vpmodule:atom:begin state-the-severity-of-the-defect -->
---
instruction_id: state-the-severity-of-the-defect
title: State the severity of the defect
summary: "A defect carries one of three severity levels, each with its own meaning."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A defect is written up as a work item.
conditions_does_not_apply_when: The item describes a change rather than a defect.
artifact_contract_output_type: severity-statement
artifact_contract_required_data:
  - the severity level
  - what the level means
artifact_contract_verified_by: "the severity names one of the levels and the level's meaning"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/bug-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/security/baseline.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
  - business
  - operations
---

# State the severity of the defect
critical: outage, data loss, or security exposure
important: core function broken, no workaround
minor: impaired, a workaround exists, or cosmetic
- Critical | 9.0 – 10.0 | Acknowledge within 24 h; fix ASAP
- Important | 7.0 – 8.9 | Acknowledge within 48 h; fix ≤1 wk
- Important | 4.0 – 6.9 | Acknowledge within 1 wk; next minor
- Minor | 0.1 – 3.9 | Acknowledge within 2 wk; next minor
<!-- vpmodule:atom:end state-the-severity-of-the-defect -->
<!-- vpmodule:atom:begin write-a-bug-with-a-reproduction-and-a-cause-hypothesis -->
---
instruction_id: write-a-bug-with-a-reproduction-and-a-cause-hypothesis
title: Write a bug with a reproduction and a cause hypothesis
summary: "A defect item carries the exact steps, what happens against what should happen, and a hypothesis about the cause — never a fix — and names the outcome that says no change was needed."
capability_tags:
  - plan-implementation
pattern_tags:
  - systematic-debugging
conditions_applies_when: A defect is written up as a work item.
conditions_does_not_apply_when: The work item describes a new behaviour rather than a defect.
artifact_contract_output_type: defect-item
artifact_contract_required_data:
  - the reproduction
  - the cause hypothesis
  - the tests for the condition
  - the proof that no change is needed
artifact_contract_verified_by: the item names a reproduction and a hypothesis and never a fix
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/assets/bug-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Write a bug with a reproduction and a cause hypothesis
A bug carries a reproduction and a cause hypothesis, never a fix.
Exact steps, environment, and what happens versus what should happen. Logs or errors verbatim.
Where the defect likely lives and why — a hypothesis, never a prescribed fix.
Missing steps: ask; unclear: tighten until someone else could follow them.
Run them when cheap; if the behavior already holds, say so with evidence and create nothing.
Criteria include tests for the condition found and fixed, and name the other valid outcome: proof no change is needed.
<!-- vpmodule:atom:end write-a-bug-with-a-reproduction-and-a-cause-hypothesis -->