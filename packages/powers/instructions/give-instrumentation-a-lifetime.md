---
instruction_id: give-instrumentation-a-lifetime
title: Give instrumentation a lifetime
summary: "Add logging only when it helps, remove it once the cause is known, and keep only the instrumentation that earns its place."
capability_tags:
  - instrument-production-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: "You add logging, metrics or tracing to find a cause."
conditions_does_not_apply_when: The instrumentation is permanent reporting that is part of the product.
artifact_contract_output_type: instrumentation-decision
artifact_contract_required_data:
  - the reason the instrumentation was added
  - when it is removed
  - what is kept permanently
artifact_contract_verified_by: every temporary log added for the investigation is removed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/debugging-and-error-recovery/SKILL.md
status: active
revision: 1
---

# Give instrumentation a lifetime

Add logging only when it helps. Remove it when done.

**When to add instrumentation:**
- You can't localize the failure to a specific line
- The issue is intermittent and needs monitoring
- The fix involves multiple interacting components

**When to remove it:**
- The bug is fixed and tests guard against recurrence
- The log is only useful during development (not in production)
- It contains sensitive data (always remove these)

**Permanent instrumentation (keep):**
- Error boundaries with error reporting
- API error logging with request context
- Performance metrics at key user flows
