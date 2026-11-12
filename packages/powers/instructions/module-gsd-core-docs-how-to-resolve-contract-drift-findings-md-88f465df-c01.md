---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-resolve-contract-drift-findings-md-88f465df-c01"
title: "gsd-core: docs/how-to/resolve-contract-drift-findings.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/resolve-contract-drift-findings.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/resolve-contract-drift-findings.md\"}"
atom_ids:
  - choose-the-contract-kind-by-reading-the-consumer
  - record-an-exemption-with-a-non-empty-reason
atom_count: 2
atoms: "[{\"atom_id\":\"choose-the-contract-kind-by-reading-the-consumer\",\"file_sha256\":\"ce0cb65ed891e8acbfcb55b537dfdfaf6b65c0d61c96d1484ec5fe5e7a0ba4ed\",\"content_sha256\":\"e8b009fdaa7e9d675568039d59b384da3415da107d272bae827da03794edaa90\",\"file_bytes\":1465,\"body_bytes\":416},{\"atom_id\":\"record-an-exemption-with-a-non-empty-reason\",\"file_sha256\":\"626423ce3ecdc50ef2360369f425e76f6d613386aa6358fddf9b72c7343bee22\",\"content_sha256\":\"205e2fb31f89621269b262026fae6bb12a01957e9244b2d2f1d72891d7ae08aa\",\"file_bytes\":1863,\"body_bytes\":641}]"
carrier_sha256: 930c25f905104e0b3e35c61a3283c8a1452299cc2f3a0e42c9a441ea4356a359
carrier_bytes: 3625
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-contract-kind-by-reading-the-consumer -->
---
instruction_id: choose-the-contract-kind-by-reading-the-consumer
title: Choose the contract kind by reading the consumer
summary: "The kind of a declared contract is a measured fact about the consumer, not a style preference."
capability_tags:
  - audit-codebase
pattern_tags:
  - decision-trail
conditions_applies_when: A declared contract row has to be given its kind.
conditions_does_not_apply_when: The consumer is not known yet.
artifact_contract_output_type: contract-kind-decision
artifact_contract_required_data:
  - the consumer
  - the line that waits for the producer
  - the chosen kind
artifact_contract_verified_by: the chosen kind names the mechanism the consumer actually uses
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-contract-drift-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the contract kind by reading the consumer
Every row declares exactly one of three kinds, and the kind is a **measured fact about the consumer**, not a style preference:
To decide, open the consumer and find the line that waits for the agent. If it greps a marker string → `sentinel-match`. If it reads a file or queries a CLI → `artifact+query`. If it parses the return message → `structured-return`.
<!-- vpmodule:atom:end choose-the-contract-kind-by-reading-the-consumer -->
<!-- vpmodule:atom:begin record-an-exemption-with-a-non-empty-reason -->
---
instruction_id: record-an-exemption-with-a-non-empty-reason
title: Record an exemption with a non-empty reason
summary: "An exemption waives only the one requirement it names and needs a reason that names an issue or a link, so it stays auditable."
capability_tags:
  - triage-reports
pattern_tags:
  - decision-trail
conditions_applies_when: A finding is exempted because another owner or a tracked issue covers it.
conditions_does_not_apply_when: The finding is fixed in place.
artifact_contract_output_type: exemption-record
artifact_contract_required_data:
  - the waived requirement
  - the reason the exemption holds
artifact_contract_verified_by: the exemption names a non-empty reason that points at an issue or a link
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-contract-drift-findings.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Record an exemption with a non-empty reason
The annotation waives **only** the consumer requirement. The marker must still be declared *and* emitted, and it still counts for case-collision detection. A non-empty reason is required — the reason is what makes the exemption auditable rather than a silent pass.
Never use it to silence a real orphan; if no reason survives scrutiny, the marker is dead and should be deleted.
The reason must name an issue (`#123`) or an `http(s)://` URL. A free-text, empty, or whitespace-only reason reports `fail_malformed_marker` — a distinct error, so you are told which of the two problems you have.
<!-- vpmodule:atom:end record-an-exemption-with-a-non-empty-reason -->