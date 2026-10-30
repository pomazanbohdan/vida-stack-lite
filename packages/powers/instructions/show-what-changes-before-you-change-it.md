---
instruction_id: show-what-changes-before-you-change-it
title: Show what changes before you change it
summary: "The changes that are about to happen are shown and confirmed first, and the output names the channel so the reader knows which line they are on."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A change is about to be applied and it is not the same as the running version.
conditions_does_not_apply_when: Nothing changes.
artifact_contract_output_type: change-preview
artifact_contract_required_data:
  - the changes
  - the confirmation
  - the channel the change belongs to
artifact_contract_verified_by: the preview was shown and confirmed before the change was applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update/steps/channel-banner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Show what changes before you change it
**If update available**, fetch and show what's new BEFORE updating:
Display preview and ask for confirmation, using `$CHANGELOG_PREVIEW` from the extract step above:
Your custom files in other locations are preserved:
**Only when `TAG=next`** (the user passed `--next`/`--rc`), prepend a channel banner so they know they are leaving the stable line — add this line immediately after the `**Latest:**` line in whichever output block renders:
On the default stable channel (`TAG=latest`), do NOT add a channel line — the output must match the prior stable behavior exactly.
