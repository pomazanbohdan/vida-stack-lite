---
type: Decision
title: 'D13 — One canonical severity scale: Critical / Important / Minor'
description: 'The severity of a finding is expressed on one scale across the corpus; the domain scales of the donors and the earlier groups of the corpus are rewritten to it, the criteria of every level kept verbatim.'
status: stable
stale_after: '2027-10-20T00:00:00Z'
tags:
- vida-powers
- corpus
- vocabulary
- review
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T23:45:00Z' }
verified: { by: human:repository-owner, at: '2026-10-20T23:45:00Z' }
revision: '2'
---

# Decision

## 1. One scale

The severity of a finding is expressed on **one scale** across the whole
corpus:

| Level | Meaning |
|---|---|
| **Critical** | blocks the change — the merge, the release or the correctness of the result |
| **Important** | must be addressed — a real defect, a risk or a rule that is not met |
| **Minor** | worth doing, does not block |

## 2. What was rewritten

The corpus carried several scales for the same thing: the groups *Must fix /
Should fix / Nice to have* of `format-quality-findings`, the *Critical /
Important / Minor* of `run-final-change-review`, and the domain scales of the
donors (a four-label scale for the general code review, a five-label scale for
the security findings, a five-label scale for the performance findings).

All of them are rewritten to the canonical three levels. The **criteria and
the action of every level are kept verbatim** from their source; only the
label changes, and the levels that had no counterpart are folded into the
nearest one with both criteria kept in the row.

## 3. Why

A severity label is a routing key: the reader, the agent and the gate all
read it. Several scales for one thing make the labels incomparable — a
*Required* in one vocabulary and a *High* in another cannot be compared, and the
corpus then cannot tell a blocker from a suggestion.

**Why the criteria are kept:** the levels are domain-specific (a merge gate, an
exploitability, a Core Web Vital threshold). Rewriting the criteria would
invent rules the donor does not state (D11 §2). Only the label — the shared
vocabulary — is unified.

## 4. Consequences

- The labels `Required`, `Optional`, `Nit`, `High`, `Medium`, `Low`, `Info` and
  `Must fix` are not part of the vocabulary of the corpus; the donor wording
  stays in the body as the criterion of its level.
- The three-level scale is what a review report and a gate use; the domain
  criteria stay in the body of the instruction that owns them.

---

# Rejected options

| Option | Why rejected |
|---|---|
| Keep the domain scales side by side | The labels become incomparable across reviews; the corpus cannot route by severity |
| Keep the levels but rename only the labels of the new donor | Two scales would remain — the same defect the decision removes (§1) |
| One flat scale with the criteria of one domain | The criteria of the other domains would be lost or invented (§3) |
