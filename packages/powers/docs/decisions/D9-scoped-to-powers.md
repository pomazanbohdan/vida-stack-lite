---
type: Decision
title: 'D9 — Work scope: only packages/powers, registration in root files deferred'
description: 'The current scope of VP work is limited to the packages/powers directory; registration of the product in the shared root files of the repository (sidecar, config, doc-policy, products.map, README, knip, root package.json) is deferred as an external dependency.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- scope
- deferral
- repository-integration
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: d2
  resource: /decisions/D2-ownership-and-work-space.md
  title: D2 — Ownership and workspace model of VP in the monorepo
- id: knip-config
  resource: /../../agent/knip.config.ts
  title: Repository knip configuration
- id: documentation-policy
  resource: /../../agent-instructions/documentation-policy.v1.json
  title: DocumentationPolicy/v1
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T00:00:00Z' }
revision: '2'
---

# Decision

**The current scope of VP work is limited to the `packages/powers/` directory.** No shared
root file of the repository is changed. Registration of the product in the repository (sidecar,
`agent-runtime.config.v1.yaml`, the documentation policy, `docs/products.map.md`,
`README.md`, the knip configuration, the root `package.json`) — is **deferred** as an external
dependency that requires a separate step with the repository owner.

## Exception permitted by the owner (rev 2)

The owner's decision dated 2026-10-19 permits **one** change outside the product directory:
registration of the VP workspace in `packages/agent/knip.config.ts` (adding the
`packages/powers` block with entry/project/ignore). The reason — knip 6.41 treats a workspace
only as a directory with a `package.json`, and without registration the files of `packages/powers/**`
fall into the repository scan as "unlisted" and break `lint:knip`
(`--max-issues 0`). This exception covers no other changes in `packages/agent`;
runtime requests remain documents in `docs/requests/`.

# What stays within the directory

| Can be done now | Cannot be done now |
|---|---|
| Product canonical documents (BR/SR/AC), research, decision records, OKF bundle | Registration of the product in `AGENT.sidecar.md`, `agent-runtime.config.v1.yaml`, doc-policy, `products.map.md`, `README.md` |
| VP schemas (`VPCatalog/v1`, `VPMethodologyProfile/v1`) and its own `catalog.*` scripts | Changes in `packages/agent` (extended instruction registry, profile reading) |
| Conversion of the donor corpus, tests, provenance | Changes in CI and in the agent package |
| The skills `vp-mode` and `vp-setup`, per-host plugin/marketplace manifests | Marketplace publication (a public Git repository is required) |
| VP Work Items and findings in the product (Standalone mode) | VP Runtime mode (requires registration and a runtime request) |

# Consequences

1. **Runtime requests are issued as documents** in `packages/powers/docs/requests/`
   (D3 + D8), not as changes in `packages/agent`; execution — outside the current scope.
2. **The product is not part of the repository documentation policy**: `canonical_roots`
   does not contain `packages/powers/docs` (R-16). The equivalent is provided by the product's own
   documentation discipline: the OKF bundle, the `docs/log.md` log,
   `bun packages/powers/scripts/check-okf.ts` and the repository
   `bun tooling/agent/check-documentation.ts` as a local link check.
3. **Risk for the foreign lint gate** (verified 2026-10-19: dependencies installed,
   the `lint:knip` gate returns `{"issues":[]}` and exit 0; the `packages/powers` workspace
   is registered in `packages/agent/knip.config.ts` under the owner exception rev 2):
   the agent's knip configuration scans the repository as a whole (`--directory ../..`) and has
   workspaces for `.`, `packages/agent`, `packages/plugin` and `packages/powers` — files of `packages/powers/**`
   may end up "unlisted" and fail on `lint:knip` (`--max-issues 0`,
   `--treat-config-hints-as-errors`). The check before the first TS file in VP:
   `bun run --cwd packages/agent lint:knip:pinned`. If the risk returns —
   a root change (owner) or a deferral of TS code is needed.
4. **The Bun version of the product** — the pin `1.4.3`, as in `packages/agent/.bun-version`;
   the tool chain — Bun only. The verified invocation form:
   `bun run --cwd packages/powers test` (the variant `bun --cwd <dir> run <script>`
   prints usage and does not execute the script).
5. **VP Runtime mode is not proven** in the current scope: there is neither registration nor
   a runtime request. The Standalone part will be proven: its own catalog, its own scripts,
   skills, corpus, Work Items, findings.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) Full scope, including root registration | Stage 0 is performed immediately | Rejected: work outside the VP directory is not agreed with the current constraint |
| (b) Only `packages/powers` | Limited to the directory, registration deferred | **Accepted** |
| (c) No code at all — documents only | Only the bundle, without TS | Rejected: without the harness the very first evidence measurements are impossible; the knip risk is verified by the gate before the first TS file |

# Impact on other decisions

- D1, D2 do not change; the D2-fix (registration) becomes a deferred part.
- D3, D4b, D5, D7, D8 have a VP part, which is implemented in the directory, and an external
  part (runtime request, publication), which is deferred.
- Implementation plan: Stage 0 is split into **0a** (inside the directory) and **0b**
  (root registration, deferred).

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
