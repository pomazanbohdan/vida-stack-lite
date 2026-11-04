---
type: Decision
title: 'D34 - EOS operating-system tags for the H1 traction-eos batch'
description: 'One capability and eight pattern tags with catalog definitions let the EOS components, scorecard, rocks and Level 10 meeting carry accurate metadata.'
status: stable
stale_after: '2027-11-04T00:00:00Z'
tags:
- vida-powers
- business
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

# D34 — EOS operating-system tags for the H1 traction-eos batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `traction-eos`. The source defines the
Entrepreneurial Operating System: V/TO vision, accountability chart, weekly
scorecard, IDS, core-process documentation, 90-day rocks, the Level 10 meeting
and a staged two-year implementation. Existing organization and planning
patterns do not describe an operating system with these components.

## Decision

Add one capability and eight pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `run-eos-operating-system` | Ability to run an EOS operating system: vision, people, data, issues, process and traction. |
| pattern | `eos-vision` | An approach in which a two-page V/TO aligns core values, focus, goals and issues. |
| pattern | `accountability-chart` | An approach in which an accountability chart assigns seats and ownership rather than titles. |
| pattern | `scorecard-indicators` | An approach in which a weekly scorecard of leading numbers shows business performance. |
| pattern | `ids-issues` | An approach in which issues are identified, discussed and solved by root cause. |
| pattern | `operating-procedure-map` | An approach in which the core 20% of operating procedures is documented for 80% consistency. |
| pattern | `ninety-day-rocks` | An approach in which 3-7 company rocks and individual rocks are set for the next 90 days. |
| pattern | `level-10-meeting` | An approach in which a fixed weekly 90-minute Level 10 meeting follows the same agenda. |
| pattern | `eos-implementation` | An approach in which EOS is installed in a staged two-year sequence. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`traction-eos` uses `run-eos-operating-system` with the eight patterns for its
components and operating rules; the score, checkup, mistake-list and diagnostic
instructions carry pattern tags only with explicit capability exemptions.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision.

## Consequences

`catalog.json` revision advances by the nine tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
