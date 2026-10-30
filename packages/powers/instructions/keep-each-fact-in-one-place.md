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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/plan-inside-an-organization.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/capability-matrix.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/skill-mapping-matrix.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/host-integration-interface.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/capability-manifest.md
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
