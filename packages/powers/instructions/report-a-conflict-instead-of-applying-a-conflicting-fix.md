---
instruction_id: report-a-conflict-instead-of-applying-a-conflicting-fix
title: Report a conflict instead of applying a conflicting fix
summary: "Before editing, the locked decisions and the constraints already in force are re-read; a fix that contradicts them is reported as a conflict instead of applied, and a conflict costs no revision iteration."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A suggested fix may contradict a locked decision or a constraint the artifact already encodes.
conditions_does_not_apply_when: No constraint is in force.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the conflict and the constraint it hits
  - the alternatives considered
  - the issues that were addressed anyway
artifact_contract_verified_by: the conflicting fix was not applied and the conflict was reported instead
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-revision.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/revision-loop.md
status: active
revision: 1
---

# Report a conflict instead of applying a conflicting fix
Before editing, re-read the constraints already in force:
- Locked decisions and deferred ideas
- Active capability / project guidance
- Constraints the existing plans already encode (chosen mechanism, scope boundary, must_haves)
A `fix_hint` conflicts when applying it would contradict any of those. Applying it anyway is a contract violation, not a judgement call.
When a hint conflicts - or when the property is unreachable without breaking a constraint - do NOT edit around it and do NOT burn a revision iteration on it:
apply every non-conflicting issue normally, and return.
A revision agent that returns
has not failed and has not stalled. Handle it BEFORE the iteration counter and the stall check - a conflict is not resolvable by re-running the same loop, so spending retry budget on it only exhausts the cap:
**Bounded - two ways, because one is evadable.**
- **Repeat.** A conflict naming the SAME `required_property` twice in a row means the chosen resolution did not take. Stop re-spawning; escalate as a stall.
- **Total.** Count every conflict return in this revision loop, whatever property each names. On the THIRD, stop and escalate - an agent that alternates property names never trips the repeat rule, so the repeat rule alone leaves the loop unbounded.
