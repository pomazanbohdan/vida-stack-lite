---
instruction_id: recall-then-filter-for-the-prohibition-axis
title: Recall then filter for the prohibition axis
summary: "The must-not axis is worked in two passes: over-produce the candidates first, then filter them in a single pass down to the ones that name a real harm."
capability_tags:
  - harden-security-controls
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The things a feature must not become have to be enumerated.
conditions_does_not_apply_when: The prohibitions are already written down.
artifact_contract_output_type: prohibition-set
artifact_contract_required_data:
  - the raw candidates
  - the candidates kept
  - the reason each was kept
artifact_contract_verified_by: the raw list was over-produced first and the kept list holds only genuine harms
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Recall then filter for the prohibition axis
**Stage 1 — Recall (adversarial prose probe).** Ask the single adversarial question of the requirement: *"What could this feature silently become that the author would NOT want, but the spec does not forbid?"*
Over-produce (~10 raw must-NOT candidates) — recall first.
**Stage 2 — Precision (one-pass classifier).** Filter the raw list in a single pass:
**DROP routine-engineering** items (normal correctness/hygiene — "must not mutate input", "must not throw on empty" — owned by the edge probe or code review); **KEEP values / safety / ethics** items (manipulative framing, protected-attribute proxies, raw PII in plaintext).
This collapses ~10 → ~2–3 genuine prohibitions.
