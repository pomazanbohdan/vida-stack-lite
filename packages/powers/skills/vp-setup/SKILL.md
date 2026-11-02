---
name: vp-setup
description: Initialize or refresh the Vida Powers methodology profile in a project instruction file, runtime config, or project config, including model lanes and unresolved groups.
---
# vp-setup

`vp-setup` initializes the project-owned Vida Powers profile. Resolve `<skill-dir>` from the sidecar's project map and run `bun <skill-dir>/scripts/cli.ts --root <dir> [options]` as a local development tool. For this project-document mode use `--carrier host-shim` for `vida-project-profile.json`; do not generate AGENTS or `.vida` files. The existing other carriers remain available to other projects. Read inventory and explicit choices, then write or use `--dry-run` and verify the resulting carrier.

1. **Detect carrier** — identify the project instruction file (AGENTS.md, CLAUDE.md) or runtime config without modifying files.
2. **Read inventory** — load JSON methodology profile and model inventory; missing inventory is a limitation, malformed inventory is an error.
3. **Resolve choices** — apply `--select <group>=<alternative>` decisions; unresolved groups remain omitted.
4. **Write or `--dry-run`** — write to existing AGENTS.md/CLAUDE.md or create new one; runtime writes `.vida/vp-profile.json`; host-shim writes `vida-project-profile.json`. `--dry-run` reports changes without writing.
5. **Verify carrier** — check the written profile; for Standalone, confirm the JSON block is correctly placed between markers.

Profiles written before `unresolved_groups` existed must be refreshed with `vp-setup` before `catalog.compose`.

## Inputs and writes

- Model inventory is JSON supplied with `--inventory` or `VP_MODEL_INVENTORY`. Missing inventory is treated as empty and recorded as a limitation; malformed inventory is an error. Model IDs are copied exactly from the inventory.
- `--select <group>=<alternative>` records a user decision. Groups without a selection or source default remain unresolved and are omitted from `groups`; no alternative is silently selected.
- `--flow-level full|medium|light` records the chosen flow level.
- Standalone writes the managed JSON block to existing `AGENTS.md`, otherwise existing `CLAUDE.md`, otherwise creates `AGENTS.md`. Runtime writes a JSON profile under `.vida/vp-profile.json`. Host-shim writes `vida-project-profile.json`.
- `--dry-run` reports the proposed carrier and changes without writing.
- This skill never changes the installed agent package (SR-57), and does not create hooks (D10 §4). It does not parse YAML; the profile payload is JSON (SR-62).

## Project-document checklist (SR-59)

At session start, after context compaction, and in delegated-agent context, verify:

1. Read the three sidecar-mapped project entries: `vida-bootstrap`, `vp-mode`, and `vp-setup`.
2. When required for the operation, verify the explicit project profile is readable and valid; report unresolved groups instead of choosing for the user. Never replace a missing or invalid explicit profile with markers.
3. Verify the active instruction sources are readable in each context. Reading project files does not prove host activation.

## Source map (SR-75)

Keep a project-readable source map alongside the project’s existing configuration records. Record the origin/revision/path of each active instruction set and the origin of the methodology profile and model inventory; record each setup-driven setting change with its selected value and the prior value where known. Preserve existing foreign instructions and source-map entries. Do not claim a source or revision that was not supplied by the project or package metadata.

## Managed Standalone block

Only text between these markers is owned by this skill. The JSON is parsed directly; surrounding instruction text is treated as opaque text.

    <!-- vida-powers:profile:begin -->

    ```json
    { "schema": "VPEffectiveProfile/v1", "groups": {}, "unresolved_groups": {} }
    ```

    <!-- vida-powers:profile:end -->
