---
instruction_id: adjust-the-behaviour-to-the-context-degradation-signals
title: Adjust the behaviour to the context degradation signals
summary: "Pressure shows up as vagueness, skipped steps and partial completion before any budget warning fires, and the run changes its behaviour accordingly."
capability_tags:
  - curate-context
pattern_tags:
  - resource-bounds
  - context-degradation-policy
conditions_applies_when: A long run notices that its own output is degrading.
conditions_does_not_apply_when: The run is short and the context is nearly empty.
artifact_contract_output_type: degradation-response
artifact_contract_required_data:
  - the signals that were seen
  - the tier they indicate
  - the behaviour that was changed
artifact_contract_verified_by: the behaviour was changed on the assessed signals and not on a token count
compatibility_excludes:
  - measure-the-context-and-start-a-fresh-session-before-it-degrades
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/context-budget.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-context-guard.md
status: active
revision: 3
---

# Adjust the behaviour to the context degradation signals

Quality degrades gradually before panic thresholds fire. Watch for these early signals:

Silent partial completion -- agent claims task is done but implementation is incomplete. Self-check catches file existence but not semantic completeness. Always verify agent output meets the plan's must_haves, not just that files exist.

Increasing vagueness -- agent starts using phrases like "appropriate handling" or "standard patterns" instead of specific code. This indicates context pressure even before budget warnings fire.

Skipped steps -- agent omits protocol steps it would normally follow. If an agent's success criteria has 8 items but it only reports 5, suspect context pressure.

DEGRADING (50-70%): Economize. Frontmatter-only reads, minimal inlining, warn user about budget. Emit warning, continue.

POOR (70%+): Emergency mode. Checkpoint progress immediately. No new reads unless critical. `warn`: emit warning + recommend the pause-work checkpoint. `auto`: invoke the pause-work checkpoint before the next wave. `off`: proceed anyway.

The guard is heuristic — no programmatic context-percentage API exists. Use your assessment of degradation signals, not a fixed token count.
