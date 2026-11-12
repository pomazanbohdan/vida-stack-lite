---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-artifact-lifetime-md-b22c12cf-c01"
title: "bmad-method: skills/bmod-method/help/artifact-lifetime.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/artifact-lifetime.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/artifact-lifetime.md\"}"
atom_ids:
  - keep-the-plans-after-the-work-is-done
  - scope-agent-reads-to-the-current-work
atom_count: 2
atoms: "[{\"atom_id\":\"keep-the-plans-after-the-work-is-done\",\"file_sha256\":\"04e4976a5978eb23bc3632b7aa9d01af7b0ac06b667a888529a2ac1ebabc57d2\",\"content_sha256\":\"0520d63afd195d21df38ecf015df0e8525637f67bbbf193bce5c61a5cf7c8bda\",\"file_bytes\":1712,\"body_bytes\":473},{\"atom_id\":\"scope-agent-reads-to-the-current-work\",\"file_sha256\":\"1e79800dc4024884e56e1e9dcdf70cf0d0d2d8d64849d041450bdbf92e7b23be\",\"content_sha256\":\"e9ce5dd38a8c24fb339ab1facfa4475a3aa2fa0dd8462b2cd73b850d84d9f64e\",\"file_bytes\":1535,\"body_bytes\":356}]"
carrier_sha256: fde6afdfa3a98cda6a8a3b1a102e0f95e0f50bd43618b143cd6a7df0768f1f8c
carrier_bytes: 3510
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-the-plans-after-the-work-is-done -->
---
instruction_id: keep-the-plans-after-the-work-is-done
title: Keep the plans after the work is done
summary: "The plan of a delivered item is live state and historical evidence: keep it beside its entry, because deleting it turns a completed entry back into planned work."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: Work has been delivered and its records are about to be cleaned up.
conditions_does_not_apply_when: The records were never written.
artifact_contract_output_type: work-record
artifact_contract_required_data:
  - the plan
  - the status it carries
  - the evidence it holds
artifact_contract_verified_by: the completed entries still read as completed after the work is done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/artifact-lifetime.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/ticketing-and-epics.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the plans after the work is done
Joined plans are live ticket state, including after work is done.
Keep them beside their entries or backlog leaves.
They preserve status, baseline revisions, implementation evidence, and review findings for later work and retrospective.
Plans own status and baseline evidence and stay local on every store.
Keep completed plans as live state and historical evidence.
Deleting plans can turn completed entries back into planned work.
<!-- vpmodule:atom:end keep-the-plans-after-the-work-is-done -->
<!-- vpmodule:atom:begin scope-agent-reads-to-the-current-work -->
---
instruction_id: scope-agent-reads-to-the-current-work
title: Scope agent reads to the current work
summary: "Point the agent at the current work: the finished plans stay as evidence, the superseded ones are archived once their references remain reachable, and no live plan is removed as part of that cleanup."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A repository holds the records of work that is finished and of work in flight.
conditions_does_not_apply_when: There is only one piece of work.
artifact_contract_output_type: context-scope
artifact_contract_required_data:
  - the current work
  - the archived records
  - what stays reachable
artifact_contract_verified_by: an agent reading the scope sees the current work first and the old records as evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/artifact-lifetime.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Scope agent reads to the current work
Scope ordinary agent reads to the active initiative and current epic in `AGENTS.md`.
Historical plans are evidence, not a replacement for the current code.
Superseded planning documents can be archived once their references and requirement sources remain accessible.
Never remove live plans as part of that cleanup.
<!-- vpmodule:atom:end scope-agent-reads-to-the-current-work -->