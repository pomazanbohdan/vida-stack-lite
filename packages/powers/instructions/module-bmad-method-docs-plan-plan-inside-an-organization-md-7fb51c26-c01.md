---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-plan-inside-an-organization-md-7fb51c26-c01"
title: "bmad-method: docs/plan/plan-inside-an-organization.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:docs/plan/plan-inside-an-organization.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/plan-inside-an-organization.md\"}"
atom_ids:
  - a-shared-decision-has-one-home
  - keep-each-fact-in-one-place
  - place-the-approvals-where-they-block
atom_count: 3
atoms: "[{\"atom_id\":\"a-shared-decision-has-one-home\",\"file_sha256\":\"c1f14034def19de16654e269463f4d764019f7d852199b004670b67e2b13f028\",\"content_sha256\":\"21bfa354e9b8edf83f24c4378593ce4f3cf6604ddfceb75dceb2ab4b0e113fde\",\"file_bytes\":2187,\"body_bytes\":633},{\"atom_id\":\"keep-each-fact-in-one-place\",\"file_sha256\":\"0d93e491c9e9dcaee78d03daa83b287fb0c228b1977e98fc17d6be2010d94ffa\",\"content_sha256\":\"60599a927f39f164ffc448de5dcb3e1c696f989129cf48aaf4917fcacedaf027\",\"file_bytes\":3616,\"body_bytes\":1882},{\"atom_id\":\"place-the-approvals-where-they-block\",\"file_sha256\":\"cc687c32ed1c2243f35a9a2929c07b7ff8f5a8ed490effe2e0f35d9213248d4e\",\"content_sha256\":\"fbf22d8f5ec0b9c59cf4fe5400f26d3330c9dc5c4cceaba4636bc9721c696104\",\"file_bytes\":1505,\"body_bytes\":364}]"
carrier_sha256: bf073abb6c75329832e67e7cf0d9113897b490fad8df06c3406770e4f33ff0f0
carrier_bytes: 7667
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-shared-decision-has-one-home -->
---
instruction_id: a-shared-decision-has-one-home
title: A shared decision has one home
summary: A decision that two or more containers must adopt is recorded in one place — a spine section or an item in the opening container — and the other containers wait on it.
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: More than one container has to adopt the same decision.
conditions_does_not_apply_when: The decision touches only one container.
artifact_contract_output_type: shared-decision-placement
artifact_contract_required_data:
  - the decision
  - the one place it is recorded
  - the containers that wait on it
artifact_contract_verified_by: the decision has one home and every other container reaches it from there
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/set-up-the-ticket-tree.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# A shared decision has one home
Every decision two or more epics must adopt has one home: a spine section, or an entry in the opening epic (the first `[[epic]]`) that the others wait on.
After the epics are agreed, the skill lists the decisions that more than one epic must adopt, such as a contract, a data format, or a shared value list.
Work in one repo or one unit needs no architecture pass.
It is needed from the second unit that must adopt a decision.
The rows are roles, not headcount. One person can hold several; what matters is that each document has exactly one owner, because each has exactly one skill that writes it.
<!-- vpmodule:atom:end a-shared-decision-has-one-home -->
<!-- vpmodule:atom:begin keep-each-fact-in-one-place -->
---
instruction_id: keep-each-fact-in-one-place
title: Keep each fact in one place
summary: "The input owns the product argument, the container owns its own sections, and a requirement id that is minted locally maps to the parent id it came from."
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "The same fact is available in an input, a source and a container."
conditions_does_not_apply_when: The fact exists in one place only.
artifact_contract_output_type: fact-ownership-map
artifact_contract_required_data:
  - the owner of each fact
  - the reference to the owner
artifact_contract_verified_by: no fact is written twice and every local id resolves to its parent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/plan-inside-an-organization.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/capability-matrix.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/skill-mapping-matrix.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/host-integration-interface.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/reference/capability-manifest.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Keep each fact in one place
The input (PRD, brief, notes) owns the product argument.
Reference a level's requirement source rather than duplicating it.
The container owns Description, Outcome, Done when, Boundaries, References, Notes.
An epic's `covers` records the parent requirement ids it owns, and every id it assigns locally — in Requirements or its own spec — maps to one of them.
An initiative's `covers` records its source ids.
Adding a local spec does not replace upstream coverage; update affected references and child mappings with it.
Nothing downstream reinterprets the PRD.
If a spec needs an answer the PRD does not give, the answer goes into the PRD first; the spec is re-run after.
Apply the change where it belongs: to the PRD if it is about what the product is, to the spine if it is about how epics stay compatible, to the spec only if it is about that epic alone.
Then re-run the later skills.
Editing a spec to work around a PRD that no longer says the right thing is how the documents stop agreeing.
- This matrix intentionally omits a per-capability `version` column. First-party capabilities are versioned **in lockstep** with the GSD Core package (their `capability.json` `version` always equals the GSD release version), so a per-row version would simply repeat the package version and churn the committed file on every release.
- This page is the human-readable projection; when they disagree, the descriptor wins.
- The declarative + imperative adapters delegate install/uninstall in-process to the **same** `installRuntimeArtifacts` engine function `bin/install.js` uses, so adapter output is byte-identical to a first-party install
- **Config key exclusivity.** A federated config key must be owned by exactly one capability and absent from the central `config-schema`. Presence in both is a collision; a half-migrated key fails the build gate.
<!-- vpmodule:atom:end keep-each-fact-in-one-place -->
<!-- vpmodule:atom:begin place-the-approvals-where-they-block -->
---
instruction_id: place-the-approvals-where-they-block
title: Place the approvals where they block
summary: "Put the human decision at the moments that already exist, each blocking one specific piece of work and producing a written result to attach."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: Several people must agree on the product and someone has to sign off before the work starts.
conditions_does_not_apply_when: One person decides and no sign-off is required.
artifact_contract_output_type: approval-moments
artifact_contract_required_data:
  - the moments
  - what each blocks
  - the written result
artifact_contract_verified_by: every moment names what it blocks and produces a written result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
  - operations
---

# Place the approvals where they block
The skills give you five moments where a human decision is expected, and each one blocks something specific.
Put approvals there rather than inventing new gates.
Every one of these produces a written result, so the approval has something to attach to.
In regulated or enterprise settings those documents are the audit trail.
<!-- vpmodule:atom:end place-the-approvals-where-they-block -->