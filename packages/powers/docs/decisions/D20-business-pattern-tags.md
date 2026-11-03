---
type: Decision
title: 'D20 - Business pattern tags for the H1 pilot'
description: 'A bounded set of business/marketing pattern tags with catalog definitions lets the remaining H1 business files carry accurate metadata without reusing engineering patterns.'
status: stable
stale_after: '2027-11-03T00:00:00Z'
tags:
- vida-powers
- business
- pattern-tags
- decision
sources:
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
---

# D20 — Business pattern tags for the H1 pilot

Date: 2026-11-03
Status: accepted

## Context

The H1 source-admission panel is applying business and marketing instructions
from the Wondelai donor. D18 plan review checks every `pattern_tag` against its
definition in `catalog.tag_dictionary.pattern`. The existing patterns describe
engineering and agent workflows: `working-backwards`, `program-orchestration`,
`implementation-planning`, `metric-gated-decision` and `safe-defaults` carry
definitions that the business instructions do not satisfy. Reusing them produced
misleading metadata and repeated review findings.

## Decision

Add a bounded set of business pattern tags with explicit definitions to
`catalog.tag_dictionary.pattern`:

| Tag | Definition |
|---|---|
| `marketing-plan` | Marketing is planned as one process across prospect, lead and customer stages. |
| `customer-avatar` | A target customer is defined by circumstances, pains and gains before the message is designed. |
| `value-proposition` | A defensible reason to choose an offer over its alternative is stated and supported by proof. |
| `channel-measurement` | Acquisition channels are chosen and their cost and value are tracked. |
| `lead-capture` | Genuine value is exchanged for contact data with explicit consent and only the needed fields. |
| `nurture-sequence` | A recurring value-first sequence educates, segments by behavior and honors unsubscribe. |
| `sales-conversion` | Objections are addressed with real proof, risk reversal and genuine urgency. |
| `customer-experience` | Post-purchase touchpoints are designed as a continuous relationship. |
| `lifetime-value` | Retention, expansion and reactivation are measured by segment and cohort. |
| `referral-program` | Referrals are systematized, disclosed and rewarded for both parties. |
| `direct-response` | A campaign has a trackable outcome, a specific action and a backend offer path. |
| `message-framework` | A message is built as a structured narrative that orders the customer, problem, guide, plan and outcome. |
| `message-stickiness` | A message is made simple, unexpected, concrete, credible, emotional and story-driven so it is remembered. |
| `persuasion-principle` | A decision shortcut is used truthfully to help a user see real value. |
| `persuasion-ethics` | Persuasion is distinguished from manipulation and checked for truthfulness, reversibility and vulnerable users. |

The tags are pattern metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

The four remaining H1 business files (`one-page-marketing`,
`storybrand-messaging`, `made-to-stick`, `influence-psychology`) use these tags.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision. A future retag would need its own reviewed batch.

## Consequences

`catalog.json` revision advances when the tags are added. The corpus and
provenance are unchanged. The tag dictionary remains the only vocabulary owner;
`check-corpus` validates every new tag against its definition.
