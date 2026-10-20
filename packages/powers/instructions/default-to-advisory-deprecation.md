---
instruction_id: default-to-advisory-deprecation
title: Default to advisory deprecation
summary: "Warn and document by default; force a deadline only when the risk justifies it, and then ship the tooling to move."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: The kind of deprecation is being chosen.
conditions_does_not_apply_when: The deprecation is compulsory because of a legal or security deadline that is already fixed.
artifact_contract_output_type: deprecation-kind
artifact_contract_required_data:
  - advisory or compulsory
  - the reason for the choice
  - the migration tooling and support for a compulsory deprecation
artifact_contract_verified_by: "a compulsory deprecation ships migration tooling, documentation and support"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
---

# Default to advisory deprecation

| Type | When to Use | Mechanism |
|------|-------------|-----------|
| **Advisory** | Migration is optional, old system is stable | Warnings, documentation, nudges. Users migrate on their own timeline. |
| **Compulsory** | Old system has security issues, blocks progress, or maintenance cost is unsustainable | Hard deadline. Old system will be removed by date X. Provide migration tooling. |

**Default to advisory.** Use compulsory only when the maintenance cost or risk justifies forcing migration. Compulsory deprecation requires providing migration tooling, documentation, and support — you can't just announce a deadline.

### Hyrum's Law Makes Removal Hard

With enough users, every observable behavior becomes depended on — including bugs, timing quirks, and undocumented side effects. This is why deprecation requires active migration, not just announcement. Users can't "just switch" when they depend on behaviors the replacement doesn't replicate.

**Red Flags**

- "Soft" deprecation that's been advisory for years with no progress
