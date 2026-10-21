---
instruction_id: fail-open-loudly-when-a-control-cannot-load
title: Fail open loudly when a control cannot load
summary: "When a control cannot be loaded the work is not blocked by it, but the missing control is announced on every pass until it is resolved; the additions of the broken extension are dropped, the control is never silenced."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
  - control-tiering
conditions_applies_when: A control declared by an extension cannot be loaded.
conditions_does_not_apply_when: The control loads normally.
artifact_contract_output_type: missing-control-warning
artifact_contract_required_data:
  - the missing control
  - the channel the warning travels on
  - the remediation the operator is given
artifact_contract_verified_by: the work proceeded and the missing control was announced on every pass
compatibility_excludes:
  - declare-what-a-hook-produces-and-consumes
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-overlay-model.md
status: active
revision: 1
---

# Fail open loudly when a control cannot load
- when GSD cannot compose an overlay, it removes the overlay's *additions* but never silences a *control* — a missing gate always surfaces, even though, per #2009, it no longer blocks the loop.
- it emits a warning through two channels — stderr (the channel host workflows/agents see when they run `gsd_run loop render-hooks <point>`) and the `loop render-hooks` JSON envelope's top-level `warnings` array.
