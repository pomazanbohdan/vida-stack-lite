---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-audit-fix-md-2be16e9c-c01"
title: "gsd-core: gsd-core/workflows/audit-fix.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/audit-fix.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/audit-fix.md\"}"
atom_ids:
  - split-a-finding-into-auto-fixable-and-manual-only
  - trace-the-commit-back-to-the-finding
  - when-uncertain-route-the-finding-to-a-human
atom_count: 3
atoms: "[{\"atom_id\":\"split-a-finding-into-auto-fixable-and-manual-only\",\"file_sha256\":\"af29cabd803f71a5442d847946ad78e2d1a1523ad514be29d14dc9c0a4bae8d0\",\"content_sha256\":\"40d259a643831c5a3de28fcf853ee45e4d019ad723ea4eef74a61c244d0b7d47\",\"file_bytes\":1926,\"body_bytes\":813},{\"atom_id\":\"trace-the-commit-back-to-the-finding\",\"file_sha256\":\"38f08cb5755e7f04782a501455e3812e811b09ffb37e20b8a08a34f4d5a3783d\",\"content_sha256\":\"e9eedc93aa762352580d8b2d97fc4c9629eaedf34401e26c20fda2c3489f77ca\",\"file_bytes\":1122,\"body_bytes\":140},{\"atom_id\":\"when-uncertain-route-the-finding-to-a-human\",\"file_sha256\":\"82985a3d9eef19491116de9eca6226b84048cdbee1be67c5e38829a19ce44871\",\"content_sha256\":\"5da970ad0982ad9a6f31c06506bfd85af259db1d522ab95b2af6f03606be4962\",\"file_bytes\":1222,\"body_bytes\":158}]"
carrier_sha256: 30d9d0023d9000e88c230a897ec6bd5e5b99f3cd762c78794c84f02176aa15b7
carrier_bytes: 4699
revision: 1
status: active
---
<!-- vpmodule:atom:begin split-a-finding-into-auto-fixable-and-manual-only -->
---
instruction_id: split-a-finding-into-auto-fixable-and-manual-only
title: Split a finding into auto-fixable and manual-only
summary: "Every finding is classified as auto-fixable, manual-only or skip, and the signals of each class are fixed so that two runs classify the same finding the same way."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A list of findings is about to be worked on.
conditions_does_not_apply_when: The findings were classified already.
artifact_contract_output_type: finding-classification
artifact_contract_required_data:
  - the class of each finding
  - the signal behind the class
artifact_contract_verified_by: every finding carries one of the three classes and the signal behind it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Split a finding into auto-fixable and manual-only
**auto-fixable** - clear code change, specific file referenced, testable fix
**manual-only** - requires design decisions, ambiguous scope, architectural changes, user input needed
**skip** - severity below the `--severity` threshold
Auto-fixable signals:
References a specific file path + line number
Describes a missing test or assertion
Missing export, wrong import path, typo in identifier
Clear single-file change with obvious expected behavior
Manual-only signals:
Uses words like "consider", "evaluate", "design", "rethink"
Requires new architecture or API changes
Ambiguous scope or multiple valid approaches
Requires user input or design decisions
Cross-cutting concerns affecting multiple subsystems
Performance or scalability issues without clear fix
<!-- vpmodule:atom:end split-a-finding-into-auto-fixable-and-manual-only -->
<!-- vpmodule:atom:begin trace-the-commit-back-to-the-finding -->
---
instruction_id: trace-the-commit-back-to-the-finding
title: Trace the commit back to the finding
summary: "Every fix commit names the finding it resolves, so the history and the report can be read together."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A fix for a finding is committed.
conditions_does_not_apply_when: The change is not a fix for a named finding.
artifact_contract_output_type: finding-commit-link
artifact_contract_required_data:
  - the finding identifier
  - the commit that resolves it
artifact_contract_verified_by: the commit message names the finding it resolves
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Trace the commit back to the finding
Commits atomically with finding IDs for traceability.
The commit message must include the finding ID
<!-- vpmodule:atom:end trace-the-commit-back-to-the-finding -->
<!-- vpmodule:atom:begin when-uncertain-route-the-finding-to-a-human -->
---
instruction_id: when-uncertain-route-the-finding-to-a-human
title: "When uncertain, route the finding to a human"
summary: "A finding whose fix needs a decision is routed to a person, and an uncertain classification is resolved as manual-only rather than attempted."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A finding is classified by whether it can be fixed automatically.
conditions_does_not_apply_when: The classification is certain.
artifact_contract_output_type: uncertain-classification
artifact_contract_required_data:
  - the class chosen
  - the rule that resolved the uncertainty
artifact_contract_verified_by: an uncertain finding was classified as manual-only
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# When uncertain, route the finding to a human
Classification heuristics (err on manual-only when uncertain):
When uncertain, always classify as manual-only.
<!-- vpmodule:atom:end when-uncertain-route-the-finding-to-a-human -->