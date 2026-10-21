---
instruction_id: remove-only-the-entries-that-carry-your-marker
title: Remove only the entries that carry your marker
summary: A removal excises the entries the component stamped as its own; every other entry and every hand-made edit is preserved.
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - ownership-scoped-removal
conditions_applies_when: A component is removed and it has written into shared files.
conditions_does_not_apply_when: The component wrote no shared entries.
artifact_contract_output_type: scoped-removal
artifact_contract_required_data:
  - the stamped entries that are removed
  - the entries that are preserved
artifact_contract_verified_by: only the entries carrying the owner marker were removed and the rest of the file is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/remove-a-capability.md
status: active
revision: 1
---

# Remove only the entries that carry your marker
Each capability-added entry is stamped at install with a marker naming the owning capability, and removal strips **only** entries carrying that marker.
No other capability's entries — and nothing you added by hand — is touched: if you hand-edited `settings.json` between install and remove (added your own hook, your own MCP server, or any other field), those edits are preserved exactly.
**Shared files themselves.** Files such as `settings.json` and `hooks.json` are edited in place, not deleted. Only the capability's specific entries are excised.
