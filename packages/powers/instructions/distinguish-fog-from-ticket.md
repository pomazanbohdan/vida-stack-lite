---
instruction_id: distinguish-fog-from-ticket
title: Distinguish fog from ticket
summary: Ticket a question only when it can be stated precisely now; keep what cannot be phrased sharply in the not-yet-specified fog.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Charting a map and deciding what becomes a ticket.
conditions_does_not_apply_when: "The question is already sharp, or it is already decided or already a ticket."
artifact_contract_output_type: map-frontier
artifact_contract_required_data:
  - tickets
  - not-yet-specified
  - out-of-scope
artifact_contract_verified_by: each ticket states a precise question and the fog is not pre-sliced into ticket-sized pieces
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/wayfinder/SKILL.md
status: active
revision: 1
---

# Distinguish fog from ticket
The map is _deliberately_ incomplete: don't chart what you can't yet see. Beyond the live tickets lies the **fog of war**: the dim view of decisions and investigations you can tell are coming but can't yet pin down, because they hang on questions still open. Resolving a ticket clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets, one at a time, until the way to the destination is clear and no tickets remain.
The map's **Not yet specified** section is where that dim view is written down: the suspected question, the area to revisit later. It's the undiscovered frontier _toward_ the destination: everything here is in scope, just not sharp enough to ticket. Write as loosely or as fully as the view allows; it doubles as a signpost for collaborators reading where the effort is headed.
**Fog or ticket?** The test is whether you can state the question precisely now, _not_ whether you can answer it now.
- **Ticket when** the question is already sharp, even if it's blocked and you can't act on it yet.
- **Not yet specified when** you can't yet phrase it that sharply. Don't pre-slice the fog into ticket-sized pieces: it's coarser than a ticket, and one patch may graduate into several tickets, or none, once the frontier reaches it.
**Not yet specified** excludes what's already decided (Decisions so far), what's already a live ticket, and what's out of scope.
