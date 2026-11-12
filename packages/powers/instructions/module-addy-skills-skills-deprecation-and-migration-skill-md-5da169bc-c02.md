---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-deprecation-and-migration-skill-md-5da169bc-c02"
title: "addy-skills: skills/deprecation-and-migration/SKILL.md module"
summary: "Carrier for 2 atomic instructions from addy-skills:skills/deprecation-and-migration/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/deprecation-and-migration/SKILL.md\"}"
atom_ids:
  - remove-the-old-system-only-after-zero-usage
  - require-a-proven-replacement
atom_count: 2
atoms: "[{\"atom_id\":\"remove-the-old-system-only-after-zero-usage\",\"file_sha256\":\"3f027af41ef52474a1fa492dc491eaf8284788b6516abd716f7cf424104a3d4a\",\"content_sha256\":\"a8790b2081554e10e80f6f2c50766672f565fd8b09d8a7e7d9f06b1e1937bd26\",\"file_bytes\":1578,\"body_bytes\":396},{\"atom_id\":\"require-a-proven-replacement\",\"file_sha256\":\"f69e4dc2849fcad589281628611e484cb05a2bcf514c38e93acfcf4d295e1d66\",\"content_sha256\":\"bffa444cbc67899a207113c4e3a92e35d9d51902b1966fb98031c9ca226a9289\",\"file_bytes\":1480,\"body_bytes\":349}]"
carrier_sha256: 0ba87f4fbd650410e775a09feed0005a9bdf04a9b38a5c80cb344f55a9d85863
carrier_bytes: 3315
revision: 1
status: active
---
<!-- vpmodule:atom:begin remove-the-old-system-only-after-zero-usage -->
---
instruction_id: remove-the-old-system-only-after-zero-usage
title: Remove the old system only after zero usage
summary: "Verify with metrics, logs and dependency analysis that no active consumer remains, then remove the code, its tests, its documentation and its configuration."
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - incremental-cutover
conditions_applies_when: The consumers of a deprecated system have been migrated.
conditions_does_not_apply_when: Consumers are still using the old system.
artifact_contract_output_type: removal-record
artifact_contract_required_data:
  - the usage evidence
  - "the removed code, tests, documentation and configuration"
  - the removed notices
artifact_contract_verified_by: the usage evidence shows zero active consumers before the removal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Remove the old system only after zero usage

Only after all consumers have migrated:

```
1. Verify zero active usage (metrics, logs, dependency analysis)
2. Remove the code
3. Remove associated tests, documentation, and configuration
4. Remove the deprecation notices
5. Celebrate — removing code is an achievement
```

**Red Flags**

- Removing code without verifying zero active consumers
<!-- vpmodule:atom:end remove-the-old-system-only-after-zero-usage -->
<!-- vpmodule:atom:begin require-a-proven-replacement -->
---
instruction_id: require-a-proven-replacement
title: Require a proven replacement
summary: "Do not announce a deprecation until the replacement covers the critical use cases, ships a migration guide, and has run in production."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A replacement for a deprecated system is being prepared.
conditions_does_not_apply_when: The replacement is already in production and proven.
artifact_contract_output_type: replacement-check
artifact_contract_required_data:
  - the critical use cases covered
  - the documentation and migration guide
  - the production evidence
artifact_contract_verified_by: the replacement covers the critical use cases and has run in production
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Require a proven replacement

Don't deprecate without a working alternative. The replacement must:

- Cover all critical use cases of the old system
- Have documentation and migration guides
- Be proven in production (not just "theoretically better")

**Red Flags**

- New features added to a deprecated system (invest in the replacement instead)
<!-- vpmodule:atom:end require-a-proven-replacement -->