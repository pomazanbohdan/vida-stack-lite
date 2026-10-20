# vp-setup

`vp-setup` initializes the project-owned Vida Powers profile. Run it when installing Vida Powers in a project, when a user changes a methodology choice, or when the available-model inventory changes. Run `bun skills/vp-setup/scripts/cli.ts --root <dir> [options]`. The shipped `scripts/setup.ts` detects a carrier without modifying files during detection, reads the JSON methodology profile and model inventory, resolves explicit choices, derives verification lanes, and writes the effective profile.

## Inputs and writes

- Model inventory is JSON supplied with `--inventory` or `VP_MODEL_INVENTORY`. Missing inventory is treated as empty and recorded as a limitation; malformed inventory is an error. Model IDs are copied exactly from the inventory.
- `--select <group>=<alternative>` records a user decision. Groups without a selection or source default remain unresolved and are omitted from `groups`; no alternative is silently selected.
- `--flow-level full|medium|light` records the chosen flow level.
- Standalone writes the managed JSON block to existing `AGENTS.md`, otherwise existing `CLAUDE.md`, otherwise creates `AGENTS.md`. Runtime writes a JSON profile under `.vida/vp-profile.json`. Host-shim writes `vida-project-profile.json`.
- `--dry-run` reports the proposed carrier and changes without writing.
- This skill never changes the installed agent package (SR-57), and does not create hooks (D10 §4). It does not parse YAML; the profile payload is JSON (SR-62).

## Activation checklist (SR-59)

At session start, after context compaction, and in delegated-agent context, verify:

1. Vida Powers skills are visible to the host, including `vp-mode` and `vp-setup`.
2. The project effective profile is present and readable; report unresolved groups instead of choosing for the user.
3. The active instructions are available in each context. If the host cannot expose them, record that as a limitation, not as a completed activation check.

## Source map (SR-75)

Keep a project-readable source map alongside the project’s existing configuration records. Record the origin/revision/path of each active instruction set and the origin of the methodology profile and model inventory; record each setup-driven setting change with its selected value and the prior value where known. Preserve existing foreign instructions and source-map entries. Do not claim a source or revision that was not supplied by the project or package metadata.

## Managed Standalone block

Only text between these markers is owned by this skill. The JSON is parsed directly; surrounding instruction text is treated as opaque text.

    <!-- vida-powers:profile:begin -->

    ```json
    { "schema": "VPEffectiveProfile/v1", "groups": {} }
    ```

    <!-- vida-powers:profile:end -->
