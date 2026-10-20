---
instruction_id: record-shipped-changes-in-a-changelog
title: Record shipped changes in a changelog
summary: "For shipped features, write the version, the date, the categories of change, and the reference that produced each entry."
capability_tags:
  - write-technical-prose
pattern_tags:
  - output-formatting
conditions_applies_when: A feature or a fix ships.
conditions_does_not_apply_when: The change is not released yet.
artifact_contract_output_type: changelog-entry
artifact_contract_required_data:
  - the version
  - the date
  - the category of each change
  - the reference for each change
artifact_contract_verified_by: the shipped change appears under its version and category
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 1
---

# Record shipped changes in a changelog

For shipped features:

```markdown
# Changelog

## [1.2.0] - 2025-01-20
### Added
- Task sharing: users can share tasks with team members (#123)
- Email notifications for task assignments (#124)

### Fixed
- Duplicate tasks appearing when rapidly clicking create button (#125)

### Changed
- Task list now loads 50 items per page (was 20) for better UX (#126)
```
