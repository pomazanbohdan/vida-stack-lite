---
instruction_id: write-a-changelog-for-consumers
title: Write a changelog for consumers
summary: "Curate the changelog by user impact, group it by kind of change, and write each entry with the change it describes."
capability_tags:
  - write-technical-prose
pattern_tags:
  - branch-integration
conditions_applies_when: A change becomes visible to the people who use the released software.
conditions_does_not_apply_when: The change is internal and has no consumer-visible effect.
artifact_contract_output_type: changelog-entry
artifact_contract_required_data:
  - the grouped entries
  - the impact phrased for the user
  - the migration note for a breaking change
artifact_contract_verified_by: "the entry is grouped by impact and was written with the change, not reconstructed later"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - operations
---

# Write a changelog for consumers

A changelog is not `git log`. It's the curated, consumer-facing answer to "what changed and do I care?" — grouped by `Added / Changed / Fixed / Deprecated / Removed / Security`, newest on top, every entry phrased around user impact, not internal mechanics.

```markdown
## [1.4.0] - 2025-06-12
### Added
- Bulk task import via CSV
### Fixed
- Timezone drift in recurring task due dates
### Deprecated
- `GET /v1/tasks/all` — use the paginated `GET /v1/tasks` (removal in 2.0)
```

Write the entry in the same change that makes the change, while the impact is fresh — not reconstructed from commit archaeology at release time. Breaking changes get a migration note and a deprecation window (follow the migration-and-deprecation skill); shipping the actual release is the release skill's job — this section is the versioning contract that feeds it.

"The changelog is just the commit log" | Commits are for you; the changelog is for consumers, curated by impact. Generating one from raw commits buries what matters.

"We'll write the changelog at release time" | By then the impact is reconstructed from memory and half of it is missing. Write the entry with the change.

A user-facing release with no changelog entry, or a changelog that's just dumped commit messages
