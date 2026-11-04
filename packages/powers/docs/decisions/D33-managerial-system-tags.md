---
type: Decision
title: 'D33 - Managerial system tags for the H1 high-output-management batch'
description: 'One capability and seven pattern tags with catalog definitions let managerial output, leverage, indicators, meetings and OKRs carry accurate metadata.'
status: stable
stale_after: '2027-11-04T00:00:00Z'
tags:
- vida-powers
- engineering
- pattern-tags
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
---

# D33 — Managerial system tags for the H1 high-output-management batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `high-output-management`. The source
defines managerial output and leverage, output indicators, production-line
management, task-relevant maturity, meeting cadence, decision roles and stretch
OKRs. Existing organization and metrics patterns describe teams, metrics and
decision records, not a manager's operating system.

## Decision

Add one capability and seven pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-managerial-system` | Ability to design a manager's operating system: output, leverage, indicators and meetings. |
| pattern | `managerial-leverage` | An approach in which managerial work is chosen by output per unit of managerial time. |
| pattern | `output-indicator` | An approach in which indicators measure shipped output that survives and pair each quantity with quality. |
| pattern | `production-line-management` | An approach in which a team is managed as a production line around its limiting step. |
| pattern | `task-relevant-maturity` | An approach in which management style is matched to the person's maturity on the specific task. |
| pattern | `decision-roles` | An approach in which a decision names who decides, consults, ratifies, vetoes and is informed. |
| pattern | `meeting-cadence` | An approach in which process meetings carry most managerial work and are scheduled by task-relevant maturity. |
| pattern | `okr-stretch` | An approach in which objectives and key results set stretch direction and are not tied to pay. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`high-output-management` uses `design-managerial-system` with the seven patterns
for its managerial rules; the scoring, mistake-list and diagnostic instructions
carry pattern tags only with explicit capability exemptions. Already-applied
files keep their existing metadata; no retroactive retag is performed by this
decision.

## Consequences

`catalog.json` revision advances by the eight tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
