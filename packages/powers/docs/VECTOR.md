---
type: Concept
title: Vida Powers — instruction change vector
description: 'Living summary of the direction of instruction changes across donor update batches, with a batch table and the current vector.'
status: stable
stale_after: '2027-11-02T00:00:00Z'
tags:
- vida-powers
- donor-updates
- instruction-quality
- vector
sources:
- id: log
  resource: /log.md
  title: Bundle update log
- id: next-actions
  resource: /next-actions.md
  title: Current Powers task list
- id: acceptance
  resource: /acceptance.md
  title: Acceptance criteria
generated: { by: human:repository-owner, at: '2026-11-02T15:00:00Z' }
verified: { by: human:repository-owner, at: '2026-11-02T15:00:00Z' }
revision: '1'
---

# Instruction change vector

This is the living summary of how donor updates change the instruction corpus.
It records direction, not the full batch evidence. The batch entry in
`/log.md` and the donor baseline remain the evidence owners.

## Current vector

Instructions move from descriptive prose to an executable contract:

- **Context before questions** — read the available material, then ask only the gap.
- **Explicit decisions** — approaches, design doc, approval gate before build.
- **Progressive disclosure** — short `SKILL.md` routes to `references/`.
- **Compaction-safe state** — ledger, wiki or reference, not session memory.
- **Human-attributed reports** — named filer and human summary.
- **Short user communication** — Outcome, Evidence, Decision/GAP, Next.
- **Gradual automation** — triggers, throttles, review brakes, loop caps.
- **Tracked updates** — provenance, map, baseline, renames and deletions.

## Batch log

| Batch | Donor | Pin | Existing instructions | Content updates | New instructions | Rejected / removed | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 | superpowers | `bb92a77741419a4ab5f06e711a283343f1ada0c3` → `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | 87 | 8 | 2 | 18 deleted; 2 rejected; 1 duplicate removed | 2,512 / 2,782 / 1,201 |
| 2 | matt-skills | `49dd158d1076134a641b33efb035946536778336` → `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | 69 | 8 | 2 | 16 deleted; 9 rejected | 2,514 / 2,776 / 1,202 |

Legend: result = corpus instructions / map records / baseline files.

## Batch update rule

After every processed donor batch:

1. Add one row to the batch table with the donor, old and new pin, counts and result.
2. Update the current vector only when the batch changes the direction; do not rewrite history.
3. Keep the batch entry in `/log.md` as the evidence owner.
4. Run `bun packages/powers/scripts/check-vector.ts` before commit.

The check fails when a processed donor pin or the latest corpus, map or baseline count is stale.
