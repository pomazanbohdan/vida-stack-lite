---
instruction_id: map-trust-boundaries-before-finding
title: Map the trust boundaries before the findings
summary: "Find the points where untrusted data enters, reason about each with STRIDE, and only then enumerate findings."
capability_tags:
  - review-code
pattern_tags:
  - threat-modeling
conditions_applies_when: A security review is about to enumerate its findings.
conditions_does_not_apply_when: The trust boundaries are already mapped and the findings are enumerated.
artifact_contract_output_type: trust-boundary-map
artifact_contract_required_data:
  - trust boundary
  - STRIDE threats considered
  - findings
artifact_contract_verified_by: every finding is attached to a mapped trust boundary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/security-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/capability-trust-model.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Map the trust boundaries before the findings
Start from trust boundaries — where untrusted data enters — and reason about each with STRIDE before enumerating findings
- The barrier is not a technical wall. It is:
- **Consent** — you explicitly approved the executable surfaces this capability declares before they ran.
- **Integrity** — the bundle you consented to is the bundle that ran (SHA verified).
- **Reversibility** — `gsd capability remove <id>` removes exactly what the ledger recorded, including entries in shared config files, leaving no orphaned state.
- These three things together mean: you know what you installed, you got what you were shown, and you can undo it completely. They do not guarantee the content is safe.
