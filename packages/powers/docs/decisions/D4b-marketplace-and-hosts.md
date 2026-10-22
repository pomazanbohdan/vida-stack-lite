---
type: Decision
title: 'D4b — VP marketplace owner and the host set of the first release'
description: 'packages/powers is itself the VP marketplace owner with per-host manifests; Codex — the verified first host, the other hosts — declared support with a marked limitation.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- marketplace
- delivery-channel
- host-compatibility
- decision
sources:
- id: d4
  resource: /decisions/D4-delivery-channels.md
  title: D4 — VP delivery channels
- id: superpowers-marketplace
  resource: https://github.com/obra/superpowers/blob/main/.claude-plugin/marketplace.json
  title: Superpowers — marketplace manifest (repository = plugin and marketplace)
- id: cursor-plugins-marketplace
  resource: https://github.com/cursor/plugins/blob/main/.claude-plugin/marketplace.json
  title: Cursor plugins — monorepo marketplace
- id: cloud-pstack-setup
  resource: /../../tooling/agent/cloud-pstack-setup.ts
  title: Cloud Pstack setup — installing plugins through a Git marketplace
- id: native-delivery-workflow
  resource: /../../.github/workflows/agent-native-delivery.yml
  title: Agent native delivery — the Source mirror pattern for publication
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
relation: refines D4
revision: '3'
---

# Decision

**`packages/powers` is itself the VP marketplace owner.** It carries per-host
`marketplace.json` (the list of plugins) and `plugin.json` (the description of the plugin itself) with
`source: "./"`, is published as a Git repository and is installed through
`codex plugin marketplace add <git-url>`.

**The host set of the first release:** **Codex — verified** (there is an installation tool
and qualification of the trusted hook in the repository). **Claude Code, Cursor, Muse, Antigravity,
Devin, Kimi — declared support**: the per-host manifests and conventions of their
catalogs are supported, but in the compatibility matrix the unverified is marked
with a limitation, not an equal PASS.

# Context and evidence

- `superpowers` — a hybrid: itself both a plugin and a marketplace (`.claude-plugin/marketplace.json`
  + `.codex-plugin/plugin.json`); `source` points to the repository root.
- `cursor/plugins` — a marketplace at the repository root, plugins in subdirectories with
  their own manifests; `source: "./<dir>"`. A scheme for many plugins, once there
  are several of them.
- `.agents/plugins/marketplace.json` — yet another host directory convention, which is already
  present in the repository as `.agents/skills/`.
- The repository already knows how to install plugins from a Git marketplace:
  `codex plugin marketplace add <source>` (`tooling/agent/cloud-pstack-setup.ts:49`).
- The repository already knows how to publish a mirror of the Source directory as a separate repository
  (the `Copy-SourceDirectory packages/agent → $package` pattern in
  `.github/workflows/agent-native-delivery.yml`).

# Consequences

1. **Marketplace publication** uses the existing Source directory mirror pattern:
   CI assembles `packages/powers` (with per-host manifests) into a public Git repository.
   The canonical copy remains in the monorepo; the published copy — a generated
   artifact with a declared Source link.
2. **Per-host manifests** (`plugin.json` + `marketplace.json`) become
   an artifact of Stage 5; their schemas are validated by a test.
3. **The host matrix** (Stage 8) distinguishes `verified` and `declared`: for Codex —
   an actual installation with evidence; for the rest — declared support with an explicit
   limitation (research §3: a host-specific adapter without invented guarantees).
4. **The public surface** of the marketplace requires product metadata: `version`,
   `license`, `owner`, URL fields for privacy/terms (as in `interface{}` in
   `superpowers/.codex-plugin/plugin.json`).
5. **A separate marketplace repository** (the "like cursor/plugins" option) is not
   set up now; it will become appropriate when there are several plugins.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) Marketplace at the root of `vida-stack-lite` | The agent repository is simultaneously a marketplace | Rejected: mixes the native delivery of the agent with the public marketplace; the marketplace must belong to the VP product |
| (b) `packages/powers` is itself the marketplace | Its own manifests, `source: "./"`, publication as a Git repository | **Accepted** |
| (c) A separate marketplace repository | The list of plugins in its own repo | Rejected: breaks the VP↔marketplace link and adds a repository to the model; appropriate when there are several plugins |
| Hosts: all with a mandatory PASS | Verify installation on each | Rejected: more external dependencies than the value of the first release |
| Hosts: Codex only | One host in the first release | Rejected: the per-host conventions are already known, and declared support with an honest limitation creates no risk |

# Impact on other decisions

- D5 (Decision Provider), D7 (consumer layout), D8 (profile schema) do not change.
- Stage 5: per-host manifests and the mirror publication pattern are added.
- Stage 8: the host matrix distinguishing `verified` / `declared`.

## Owner layout update — 2026-10-22

The repository owner approved two target-specific native layouts from the single
`packages/powers` Source: Muse uses a root `marketplace.json` with the package nested
under `plugins/vida-powers/`; Antigravity uses a separate compatible plugin-root
manifest. This supersedes the universal `source: "./"` assumption for these two
targets only. At the time of this layout update, the .47 plan was complete and the .50
review was in progress; native formation had not started. The historic
Codex `host-verified` status remains a D4b record and is not a current install result.
No host installation or public release is authorized by this layout decision.

**Formation status — 2026-10-22.** The `.54` receipt records 5,233 local fixture outputs
from the canonical Source. The Muse and Antigravity payload maps each cover 2,615
files and match by path, byte length, and SHA-256. The fixture CLI build/check exited
0 with no writes or removals, and the Source inventory stayed unchanged. Muse
marketplace formation remains blocked with `MANIFEST_MUSE_CATALOG_NOT_READY` because
first-party digest proof is absent. The default production check returns
`MANIFEST_INPUT_MISSING`; production inputs and outputs remain absent. No host
installation, public release, or Runtime acceptance is claimed. Receipt:
`../../../../.tmp/panel/native-formations-implementation-20261022-54/final-handoff.json`.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
Refines D4; D4 is not revoked.
