---
instruction_id: use-the-fallback-instead-of-skipping-the-lookup
title: Use the fallback instead of skipping the lookup
summary: "When the preferred documentation channel is unavailable the fallback is used; the lookup is never skipped, and no package is auto-downloaded to get it."
capability_tags:
  - research-primary-sources
  - degrade-gracefully-under-failure
pattern_tags:
  - guidance-selection
conditions_applies_when: The documentation channel you prefer is not available in this environment.
conditions_does_not_apply_when: The channel is available.
artifact_contract_output_type: documentation-lookup
artifact_contract_required_data:
  - the channel used
  - the fallback path
artifact_contract_verified_by: the lookup was performed through the fallback and nothing was auto-downloaded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/research-documentation-lookup.md
status: active
revision: 1
---

# Use the fallback instead of skipping the lookup
Do not skip documentation lookups because MCP tools are unavailable — the CLI fallback works via Bash and produces equivalent output
Do NOT use `npx --yes` to auto-download
this silently executes unverified packages from the registry
