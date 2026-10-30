---
type: Runtime Request
id: REQ-D3-D8
title: 'REQ-D3-D8 — VP instruction registry and methodology profile'
description: 'Draft request to the Agent maintainer for one D3/D8 integration plan and its approved policy gates.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- runtime-request
- d3
- d8
sources:
- id: decision-registry
  resource: /decisions/D3-instruction-catalog-and-registry.md
  title: D3 instruction catalog and registry
- id: decision-profile
  resource: /decisions/D8-methodology-profile.md
  title: D8 methodology profile
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
- id: catalog-design
  resource: /catalog-design.md
  title: Vida Powers instruction catalog design
- id: implementation-plan
  resource: /implementation-plan.md
  title: Vida Powers implementation plan
- id: vp-catalog
  resource: /catalog.json
  title: Canonical VP catalog listing
- id: vp-catalog-schema
  resource: /config/vpcatalog.v1.schema.json
  title: VPCatalog/v1 schema
- id: vp-instruction-schema
  resource: /config/vpinstruction.v1.schema.json
  title: VP instruction frontmatter schema
- id: vp-methodology-profile
  resource: /config/methodology-profile.json
  title: VP source methodology profile
- id: vp-methodology-profile-schema
  resource: /config/vpmethodologyprofile.v1.schema.json
  title: VPMethodologyProfile/v1 schema
- id: vp-effective-profile-schema
  resource: /config/vpeffectiveprofile.v1.schema.json
  title: VPEffectiveProfile/v1 schema
- id: vp-catalog-reader
  resource: /skills/vp-mode/scripts/catalog.ts
  title: Current VP catalog reader and composer
- id: vp-catalog-cli
  resource: /skills/vp-mode/scripts/catalog-cli.ts
  title: Current VP catalog CLI
- id: vp-frontmatter-reader
  resource: /skills/vp-mode/scripts/frontmatter.ts
  title: Current VP instruction frontmatter reader
- id: vp-schema-reader
  resource: /skills/vp-mode/scripts/schema.ts
  title: Current VP schema validator
- id: vp-setup-reader
  resource: /skills/vp-setup/scripts/setup.ts
  title: Current VP profile setup and materialization
- id: vp-setup-cli
  resource: /skills/vp-setup/scripts/cli.ts
  title: Current VP setup CLI
- id: agent-runtime-observation
  resource: /../../agent/src/research-decision.ts
  title: Current Agent registry validation and activation surfaces
- id: agent-config-observation
  resource: /../../agent/src/config/runtime-config.ts
  title: Current Agent runtime configuration surface
- id: agent-registry-schema
  resource: /../../agent/schemas/instruction-registry.v1.schema.json
  title: Current InstructionRegistry/v1 schema
- id: agent-runtime-config-schema
  resource: /../../agent/schemas/agent-runtime-config.v1.schema.json
  title: Current AgentRuntimeConfig/v1 schema
- id: agent-project-config-schema
  resource: /../../agent/schemas/project-configuration.v1.schema.json
  title: Current ProjectConfiguration/v1 schema
- id: runtime-config-file
  resource: /../../../agent-runtime.config.v1.yaml
  title: Current Agent runtime configuration file
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T21:24:38Z' }
revision: '4'
---

# REQ-D3-D8 — VP instruction registry and methodology profile

## Request status

**Draft; prepared for owner review; unsent and unaccepted.** This packet requests an owner response and a future implementation plan. It does not authorize Agent Source writes, delivery, installation, Runtime acceptance, or user acceptance. It is separate from Work Item VP-7. The source-binding table pins the current inputs and does not prove source admission or a handoff.

## Intent and contract trace

The request implements the D3 boundary for a separate VP extended registry and the D8 boundary for VP-owned methodology profile data. The trace is BR-07 and BR-16, D3/D8, SR-33 through SR-41, AC-15, AC-19, AC-26, and Stage 7 of the [implementation plan](../implementation-plan.md). AC-15 keeps profile conflict handling, AC-19 keeps the carrier rule, and AC-26 with SR-58 keeps the composed-bundle limit. The [acceptance criteria](../acceptance.md), [catalog design](../catalog-design.md), D3 and D8 define the current contracts; this request adds no canonical ACs.

## Current evidence and boundaries

- The Agent currently reads the root `agent-runtime.config.v1.yaml`. It contains `research_decision.registry` under `InstructionRegistry/v1`; [instruction-registry.v1.schema.json](../../../agent/schemas/instruction-registry.v1.schema.json) limits the registry to 64 entries. The exported `validateInstructionRegistry` also checks exact fields, duplicate IDs, and the registry digest. Its existing `source_path` contract remains unchanged.
- [agent-runtime-config.v1.schema.json](../../../agent/schemas/agent-runtime-config.v1.schema.json) owns the current `research_decision` config shape. [project-configuration.v1.schema.json](../../../agent/schemas/project-configuration.v1.schema.json) references that same field and defines no VP profile field.
- D8 names `.vida/project.yaml` as the Runtime target carrier and ties the profile section's appearance to the cutover. No existing VP profile support is claimed in the active config or the target carrier.
- Current `vp-setup` writes `.vida/vp-profile.json` for its Runtime mode and `vida-project-profile.json` for its host-shim mode. Those JSON files are setup materializations. The Agent does not read them as its Runtime configuration or profile.
- Exported Agent surfaces observed for owner assessment are `validateInstructionRegistry` and `resolveInstructionActivation` in [research-decision.ts](../../../agent/src/research-decision.ts), plus `ResearchDecisionConfig` in [runtime-config.ts](../../../agent/src/config/runtime-config.ts). The internal, non-exported `assertResearchDecisionConfiguration` validates the current `research_decision` field. The Agent's `ProjectConfiguration/v1` schema references that field and has no VP profile field. These are read-only observations and candidates, not approved extension APIs or final edit locations.
- Current sources show no VP extended registry, profile reader, or Agent-bound generated Runtime artifact. The Agent maintainer chooses the final schema, config, reader, and artifact paths.
- No approved required/optional policy exists for a VP registry or profile. The request asks the Agent maintainer to propose explicit behavior for owner approval. Missing input has no silent default.

## Current VP CLI and materialization contract

`packages/powers/catalog.json` is the `VPCatalog/v1` corpus listing. Each instruction entry carries its ID, path, and content SHA-256. `catalog.ts` reads the listed instruction files and checks their digests. `catalog-cli.ts` exposes `tags`, `search`, `get`, `compose`, and `evaluate`; successes are JSON on stdout, and failures are JSON on stderr with `code`, `message`, and `details`, followed by exit code 1. Current errors include `CATALOG_INVALID`, `CATALOG_DIGEST_MISMATCH`, and `CATALOG_BUNDLE_LIMIT_EXCEEDED`.

`methodology-profile.json` is the `VPMethodologyProfile/v1` source profile. `vp-setup` resolves it into `VPEffectiveProfile/v1`; `catalog.compose` accepts the effective profile, not the source profile. The `vp-setup` CLI requires `--root` and accepts `--carrier`, `--inventory`, `--select`, `--flow-level`, and `--dry-run`. It prints a JSON summary on success and a JSON `error` object on stderr with exit code 1 on failure. Standalone materializes a managed JSON block in the project instruction file. Runtime mode writes `.vida/vp-profile.json`; host-shim mode writes `vida-project-profile.json`. These outputs do not update `.vida/project.yaml` or the current Agent config.

AC-15 keeps conflicting profile choices unresolved until the owner decides. AC-26 and SR-58 keep the current composition limit at 20 instructions and 64,000 UTF-8 bytes summed over selected instruction `content` after profile filtering, active-alternative replacement, and dependency closure. Overflow returns `CATALOG_BUNDLE_LIMIT_EXCEEDED` for the whole result. The Runtime request preserves these VP contracts and does not change either CLI.

## Current Source binding

The request is bound to the published Source commit `fafb40158d20a2a10155d6ef984dfd55c36be23d`, observed as the local `HEAD` during preparation. The table lists the current VP schema, catalog, profile, and reader inputs at that commit. Each value is SHA-256 over exact file bytes.

| Current VP input | Role | SHA-256 |
|---|---|---|
| `packages/powers/catalog.json` | Canonical catalog listing and per-instruction content digests | `5b0e9baf5f98bce8dea17fff426991b196ed5c57faca00817d913bd72a92c119` |
| `packages/powers/config/vpcatalog.v1.schema.json` | Catalog schema | `a66519d7e79e94a1000812b04a116d3527c9db3f85227e06f274a7c06ccf259c` |
| `packages/powers/config/vpinstruction.v1.schema.json` | Instruction frontmatter schema | `9013cdff5605103ef0a595880e92abaadef2747dd6d70acc323bc441ada6bda3` |
| `packages/powers/config/vpmethodologyprofile.v1.schema.json` | Source profile schema | `e7bc8866245eb90361335137a89a0a464a110e8a52c7664ade4f68c0977fe193` |
| `packages/powers/config/methodology-profile.json` | Source profile instance | `4b852bdd6332a2d6e7b1a726778d148b31d7fed8335e318558f63e4cc5048690` |
| `packages/powers/config/vpeffectiveprofile.v1.schema.json` | Resolved profile schema | `52a73c423eb1d6bf0f79192d3a6bdad24308ccac3a092bb56592191f2631c1ab` |
| `packages/powers/skills/vp-mode/scripts/catalog.ts` | Catalog loading, digest checks, and composition | `186dccc21d860a18a25471273f6246dd4b8af0cc4c725143944ca721fe0adf5d` |
| `packages/powers/skills/vp-mode/scripts/catalog-cli.ts` | Catalog CLI and error materialization | `38d19759d2cb1eec2129822b3537954673c457f4ea9f00ec2f73ceb7615b1833` |
| `packages/powers/skills/vp-mode/scripts/frontmatter.ts` | Instruction frontmatter reader | `20fa39b3a4779c4af19b9503088e932f1a515e8ae0239491b20f7c7f54757c9e` |
| `packages/powers/skills/vp-mode/scripts/schema.ts` | VP JSON schema validation | `9c49067f1977e966d59d07a2ececa71eddf42d43674248a24937ed78100d5b25` |
| `packages/powers/skills/vp-setup/scripts/setup.ts` | Profile setup and carrier materialization | `886fb83acf1fe8f1d9477aa575c17878e46a0a1625dc4d45420017f1437a485a` |
| `packages/powers/skills/vp-setup/scripts/cli.ts` | Profile setup CLI entry | `8878ae7cd0d1a5fee18554d027c930367e28a7f916a3727b6a870464a9bc014d` |

The immutable commit also binds D3/D8 and the observed Agent sources. This table excludes the request, Step G plan, VP-7, queue, and log so status edits cannot create a hash cycle. A change to any listed input requires a new binding before handoff. This binding proves local input identity only; it does not prove artifact formation, delivery, source admission, or Runtime acceptance.

## Requested scope

1. VP owns its canonical instruction content, the `VPMethodologyProfile/v1` source schema and field semantics, the `VPEffectiveProfile/v1` resolved output schema, and the generated VP artifact with its declared Source binding.
2. The Agent maintainer owns the separate extended registry schema/config, Runtime reading and validation, and integration with the existing activation engine. Identify the exact source/config files in the response.
3. Preserve the existing `InstructionRegistry/v1`, `research_decision.registry`, 64-entry limit, `source_path` contract, and activation semantics. Do not extend or repurpose that registry for VP entries.
4. Reuse existing activation behavior for the declared Source link/digest, privacy, size, and output checks. Do not add a resolver, scheduler, execution graph, ledger, state store, or copied VP source package.
5. Resolve the current-versus-cutover carrier policy and migration sequence. D8's target is `.vida/project.yaml`; the current config is read by the Agent but has no VP profile section. Do not claim existing support in either carrier.
6. Propose required/optional behavior for both registry and profile, including missing and invalid input. Obtain explicit owner approval before implementation; do not silently select a default.
7. Use the current Source binding above for the reviewed request packet. If a listed input changes before handoff, recompute its hash and update the request. Future Agent implementation receipts bind their exact Agent Source and schema inputs separately. E5a manifest work is not a prerequisite.
8. Do not add project/provider registration, a new Work Item contract, or a copied VP source package.

## Requested measurable acceptance and evidence

- A separate VP extended registry contract is consumed by the Agent package without changing the existing registry contract.
- The existing activation engine validates and activates the generated VP artifact with its declared Source/digest, privacy, size, and output checks.
- The Agent reads the VP effective profile through the owner-approved carrier policy and validates it against the VP-owned schema; invalid or mismatched input is rejected.
- The approved required/optional policy defines missing registry/profile behavior without silent defaults. Focused Agent tests cover valid and invalid registry/profile input, Source or digest mismatch, privacy, size and output-schema checks, and missing-input behavior under that policy.
- The integration preserves AC-15 profile conflict behavior and AC-26/SR-58 whole-result composition limits.
- No second resolver, state store, scheduler, execution graph, or copied VP source is introduced.
- The Agent maintainer returns exact changed paths, schema/config versions, focused test names, commands, structured error outcomes, and receipts bound to the final Agent and VP input hashes.
- Static and fixture evidence remains distinct from Runtime execution and attributable user acceptance. Request delivery is not Runtime acceptance.

## Open decisions for the owner response

- Which reader path applies before and after the `.vida/project.yaml` cutover, and what migration or compatibility sequence governs it?
- Is the extended registry required or optional, under which activation conditions, and how is absence reported?
- Is the profile required or optional, under which conditions, and how are missing and invalid inputs handled? No silent defaults are permitted.
- Which Agent-owned schema/config/source paths and generated artifact location implement the approved behavior, and which Agent errors report missing, invalid, or mismatched inputs?
- Which exact Agent and VP input hashes bind later implementation receipts? Rebind if any listed VP input changes.
- Which test receipts and Runtime observations are required before any Runtime acceptance claim?

## Requested response and handoff

Please return the proposed policy answers, the Agent-owned implementation path/schema list, migration sequence, focused test plan, and evidence requirements. The Vida Powers owner retains the profile schema and source semantics; the Agent maintainer retains Runtime registry/config/reader ownership. Any change to D3/D8 behavior returns to the respective owner for approval.

The source binding pins the current local inputs only. The G queue remains open because no attributable handoff or admission evidence exists. This document does not authorize delivery or establish Runtime acceptance. E5a is not a prerequisite.
