---
type: Work Item
id: VP-5
title: 'VP-5 — vp-mode, vp-setup, package, and delivery channels'
description: 'Stage 5 work item for routing, setup, packaging, and the three approved delivery channels.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- work-item
- stage-5
sources:
- id: implementation-plan
  resource: /implementation-plan.md
  title: Vida Powers implementation plan
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
- id: decision-provider
  resource: /decisions/D5-decision-provider.md
  title: D5 decision provider
- id: decision-consumer-initialization
  resource: /decisions/D7-consumer-initialization.md
  title: D7 consumer initialization
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T07:51:49Z' }
revision: '4'
---

# VP-5 — `vp-mode`, `vp-setup`, package, and delivery channels

## Owner and state

Owner: Vida Powers owner. State: draft. This Markdown record is a human planning item, not a machine-admitted `WorkItem/v1` record and not proof that Stage 5 is complete.

The Agent-owned `workflowWorkItemSchema` and runtime contract require eleven fields: `schema`, `id`, `provider`, `provider_type`, `canonical_kind`, `intent`, `project_id`, `title`, `description`, `labels`, and `risk_flags`. No provider or project binding is supplied here. Runtime admission remains a separate owner gate.

## Goal

Deliver Stage 5's VP routing and setup behavior, package, and three delivery channels while keeping the execution graph with its existing owner and preserving the host/runtime authorization boundaries.

## Frozen Work Scope

- `vp-mode` accepts an ordinary-language request, selects instructions, forms a bundle with role, task contract, effective methodology, scope, materialization requirements and artifact references, then delegates or executes with fallback to the main agent.
- D5 routing separates LLM selection, agent formation from the catalog, and flow level from the methodology profile. `workflow.options` and `decision.evaluate` remain provider-neutral; the relevance threshold is calibrated per operation; VP does not compile an execution graph.
- `vp-setup` initializes each declared environment using its own existing writer boundary, preserves third-party instructions and verifies activation. Host-hook trust gaps remain explicit.
- Delivery covers the separate plugin, the build into the Agent package with a declared Source link and digest, and the marketplace. Host claims distinguish verified from declared support.
- Runtime registry/profile integration stays with the Agent maintainer under the separate D3/D8 request. This Work Item grants no Agent Source or project/provider registration authority.

## Acceptance references

Relevant canonical criteria include AC-13 through AC-19, AC-25 through AC-28, AC-41, and AC-45 through AC-46. Their states remain governed by the canonical acceptance document; this draft closes none. The trace includes BR-01, BR-05, BR-07, BR-19, BR-20, the Stage 5 section of the [implementation plan](../implementation-plan.md), and the [system specification](../system-specification.md).

## Implementation status before .54 (2026-10-22)

The .38 evidence records Bun 1.4.3 and Node 24.16 setup/compose smokes, 2,510 payload
hash matches, 54 focused tests and a 28-file typecheck; Deno is unavailable and full
Step E gates remain open. E5a bounded code is independently READY after .49; this does
not establish a host install. Muse and Antigravity layouts are approved; the .47 plan
is complete and .50 independent review is running, while native implementation remains
pending. Muse docs specify the package_sha256 install-command gate but no exact digest
algorithm or vector. Production outputs, host acceptance and release remain open.

## Relations

- `implements` → Stage 5 in the [implementation plan](../implementation-plan.md).
- `derived-from` → BR-01/BR-05/BR-07/BR-19/BR-20, D5, and D7.
- `blocks` → VP-7, which depends on Stages 5 and 6.
- Related Work Items: VP-6 and VP-7.

## Expected evidence

- Focused tests for routing, setup idempotency, preservation of third-party instructions, bundle limits, and generated manifests.
- Reproducible package/source binding receipts, plus a host matrix separating verified and declared capabilities.
- A real installation record for each channel whose acceptance requires one; a manifest or static check is not host acceptance.
- Exact source hashes and test receipts bound to the final frozen inputs.

## Artifact contract

- **Output kind:** Stage 5 VP routing/setup package and channel-specific delivery artifacts with their evidence.
- **Required data:** the selection and bundle behavior, setup inputs and outputs, generated manifest/source bindings, support status by host, and the test or installation evidence required by each channel.
- **Materialization location:** VP-owned code and artifacts under `packages/powers/skills/`, package manifests and marketplace files under `packages/powers/`; any Agent registry/config/source changes remain in Agent-owned paths and require the D3/D8 owner workflow.
- **Presence/format/digest verification:** check the expected files, parse/schema shape, generated Source link, and declared digests for the exact selected inputs.
- **Semantic verification:** establish routing, scope, setup preservation, and host behavior with their focused tests and required real-host observations. Presence or digest alone does not establish these outcomes.

## E5 formation and gate status (2026-10-22)

E4 is implemented with setup/compose evidence recorded in .38; documentation states the
canonical effective-profile behavior and exact content-only bundle boundary. Deno remains
unavailable. M31 marked the E5 builder and formation code component READY. The `.54` receipt
records 5,233 local fixture outputs; the Muse and Antigravity payload maps each contain 2,615
files and match by path, byte length, and SHA-256. Muse catalog formation remains blocked
with `MANIFEST_MUSE_CATALOG_NOT_READY`; the default production check returns
`MANIFEST_INPUT_MISSING`, and production inputs/outputs remain absent. The `.60` package
tests passed (411 pass, 1 Windows skip, 0 fail), but coverage and Knip exited 1. Their repairs
and rerun remain pending. No host installation, public release, or Runtime acceptance is
established; see the canonical [Step E status](../task-plan-step-e.md#e5-target-status).

## Links and handoff

- [Implementation plan](../implementation-plan.md)
- [Business requirements](../business-requirements.md)
- [System specification](../system-specification.md)
- [Acceptance criteria](../acceptance.md)
- [D5 decision](../decisions/D5-decision-provider.md) · [D7 decision](../decisions/D7-consumer-initialization.md)

