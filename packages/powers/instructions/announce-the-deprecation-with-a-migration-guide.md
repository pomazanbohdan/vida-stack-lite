---
instruction_id: announce-the-deprecation-with-a-migration-guide
title: Announce the deprecation with a migration guide
summary: "The notice states the status, the replacement, the removal date, the reason, and the concrete steps a consumer follows to move."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A deprecation is announced to the consumers of the old system.
conditions_does_not_apply_when: The deprecation is internal and has no consumers to migrate.
artifact_contract_output_type: deprecation-notice
artifact_contract_required_data:
  - status
  - replacement
  - removal date
  - reason
  - migration steps
artifact_contract_verified_by: the notice names the replacement and a consumer can follow the steps without asking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 2
---

# Announce the deprecation with a migration guide

```markdown
## Deprecation Notice: OldService

**Status:** Deprecated as of 2025-03-01
**Replacement:** NewService (see migration guide below)
**Removal date:** Advisory — no hard deadline yet
**Reason:** OldService requires manual scaling and lacks observability.
            NewService handles both automatically.

### Migration Guide
1. Replace `import { client } from 'old-service'` with `import { client } from 'new-service'`
2. Update configuration (see examples below)
3. Run the migration verification script: `npx migrate-check`
```

**Red Flags**

- Deprecation announcements with no migration tooling or documentation
- The reference docs mark it deprecated with the successor + the removal version.
- The negotiation emits a `warnings` entry when a host uses a deprecated value.
