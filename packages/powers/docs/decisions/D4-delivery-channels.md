---
type: Decision
title: 'D4 — VP delivery channels: separate plugin, build into the agent package, marketplace'
description: 'Three delivery channels remain in product scope; current project adoption reads the canonical vida-bootstrap, vp-mode and vp-setup documents through a project sidecar without harness installation or Runtime integration.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- distribution
- delivery-channel
- skills
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: superpowers-plugin-manifest
  resource: https://github.com/obra/superpowers/blob/main/.codex-plugin/plugin.json
  title: Superpowers — plugin manifest for Codex
- id: superpowers-marketplace
  resource: https://github.com/obra/superpowers/blob/main/.claude-plugin/marketplace.json
  title: Superpowers — marketplace manifest
- id: cursor-plugins-marketplace
  resource: https://github.com/cursor/plugins/blob/main/.claude-plugin/marketplace.json
  title: Cursor plugins — monorepo marketplace
- id: cloud-pstack-setup
  resource: /../../tooling/agent/cloud-pstack-setup.ts
  title: Cloud Pstack setup — installing plugins through a Git marketplace
generated: { by: codex/gpt-6.1-sol, at: '2026-11-02T11:10:10Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '5'
---

# Decision

**Current project adoption (owner decision, 2026-11-02):** consume the canonical
Powers source as project documentation through `AGENT.sidecar.md`. The required
role entry is `skills/vida-bootstrap/`; `vp-mode` supplies the instruction
retrieval procedure and `vp-setup` supplies the project-profile procedure.
`SKILL.md` is a source format, not evidence of host registration or activation.
The project profile is an explicit `vida-project-profile.json` record. Native
plugin installation, manifests, marketplace delivery and Agent runtime
integration are separate future work, not prerequisites for this adoption.
The three delivery channels below remain the product's delivery direction;
this project-document phase neither qualifies nor implements those channels.

**The current scope includes three VP delivery channels:**

1. **A separate VP plugin** — a standalone plugin with its own skills, hook and catalog
   scripts; installation through `vp-setup`; works in compatible hosts without Runtime.
2. **A build into the agent delivery package** — VP instructions travel in the native delivery of
   the agent together with the extended instruction registry (D3); the canonical copy remains
   in VP, into the package goes a generated artifact with a declared Source link.
3. **A marketplace channel** — public distribution of VP as a plugin through a Git marketplace
   of the host; it requires its own marketplace definition, which the repository does not yet have.

**The VP skill surface:**

- **`vida-bootstrap`** — required project-document role contracts for the
  orchestrator and delegated agents; a local composer preserves tags and
  base-plus-family loading without an installed Agent or catalog.
- **`vp-mode`** — the **main orchestration skill**: a request in ordinary language → selection of
  instructions → bundle → delegation or execution. This is that same "single working entry
  point" that research calls the Router Skill.
- **`vp-setup`** — the **auxiliary setup skill**: project discovery, idempotent
  management of the integration block, setup of available hooks, layout matching,
  activation verification. It does not run on every request.

# How plugin delivery works (evidence from existing donors)

**Plugin manifest — per host directory.** One repository publishes itself to
many hosts through separate manifest directories:

| Host | File |
|---|---|
| Codex | `.codex-plugin/plugin.json` |
| Claude Code | `.claude-plugin/plugin.json` |
| Cursor | `.cursor-plugin/plugin.json` |
| Muse | `.muse-plugin/plugin.json` |
| Antigravity | `.antigravity-plugin/plugin.json` |
| Devin | `.devin-plugin/plugin.json` |
| Kimi | `.kimi-plugin/plugin.json` |

Fields of `plugin.json` (per `superpowers`): `name`, `version`, `description`,
`author{name,email,url}`, `homepage`, `repository`, `license`, `keywords[]`,
`skills` (path to the skills directory), `hooks{}`, and for Codex — `interface{}`
(`displayName`, `shortDescription`, `longDescription`, `developerName`,
`category`, `capabilities[]`, `defaultPrompt[]`, URL fields, `brandColor`,
`composerIcon`, `logo`, `screenshots[]`).

**Marketplace manifest — also per host directories:** `.claude-plugin/marketplace.json`,
`.cursor-plugin/marketplace.json`, `.muse-plugin/marketplace.json`,
`.agents/plugins/marketplace.json`. Fields: `name`, `description`, `owner{name,email}`,
`plugins[]{name, description, version, source, author}`. The monorepo
pattern (`cursor/plugins`): the marketplace at the repository root, each plugin — in
its own directory with its own manifest, and `source` points to the path (`./<dir>`).
`superpowers` — a hybrid: it is itself both a marketplace and a plugin.

**Installation in the repository already knows how:** `codex plugin marketplace add <git-url>`
(`tooling/agent/cloud-pstack-setup.ts:49`) — a Git repository as the source of the
marketplace.

# Consequences

> **Clarification (D9).** Three channels are in scope. What is deferred is not the channel but the **publication**
> of the marketplace: it needs a public Git repository, and the owner's decision has not yet been
> made. Channel 1 (separate plugin) and channel 2 (build into the agent package) do not
> depend on publication.

1. **Stage 5** delivers: the source entries `vida-bootstrap`, `vp-mode` and `vp-setup`;
   the hook; its own `catalog.*` scripts; per-host VP plugin manifests for the two
   host-delivered skills; and the marketplace definition. Host delivery of
   `vida-bootstrap` remains a separate, unauthorized extension.
2. **Stage 9** no longer contains the marketplace as "out of scope": channel 3 moves into the
   working scope (together with it — the marketplace infrastructure that the repo lacks).
   D14 and D15 supersede the blanket domain-pack exclusion for the selected instruction
   domains and typed reference records. D14's 2026-10-25 extension includes product and
   business guidance under individual source gates. Other unselected domains remain outside
   scope, as do the UI on the VIDA API and external synchronization of issue trackers.
3. **Channel 1 needs no Runtime**; channels 2 and 3 have different readiness evidence:
   channel 2 — a build with provenance into the native package, channel 3 — an installed
   marketplace channel with its own host matrix.
4. **Publication** of the marketplace — a public surface: it requires a separate decision
   about where the marketplace definition lives and who consumes it (D4b).

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) Channels 1 + 2 | Plugin and build into the agent package | Rejected: distribution without a marketplace does not reach new hosts; D3 already provides for two modes, and the marketplace is a separate public channel |
| (b) Standalone plugin only | One channel | Rejected: VP does not reach the VIDA contour as a methodological layer |
| (c) Channels 1 + 2 + 3 | Plugin, agent package, marketplace | **Accepted** |

# Impact on other decisions

- D7 (target consumer layout) does not change: delivery channels do not determine
  the layout of the consumer project.
- D5 (Decision Provider) does not change: the provider-neutral interface is the same
  for all channels.
- Next clarification: **D4b** — where the marketplace definition lives and which host set
  is part of the first release.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
The repository owner's 2026-11-02 instruction selects project-document adoption,
requires the Powers-owned orchestrator/agent bootstrap, and authorizes its
implementation. It grants no host installation, publication or Runtime acceptance.
