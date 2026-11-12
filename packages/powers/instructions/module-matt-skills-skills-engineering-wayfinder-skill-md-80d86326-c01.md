---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-wayfinder-skill-md-80d86326-c01"
title: "matt-skills: skills/engineering/wayfinder/SKILL.md module"
summary: "Carrier for 3 atomic instructions from matt-skills:skills/engineering/wayfinder/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/wayfinder/SKILL.md\"}"
atom_ids:
  - chart-decisions-not-deliverables
  - distinguish-fog-from-ticket
  - keep-the-map-an-index
atom_count: 3
atoms: "[{\"atom_id\":\"chart-decisions-not-deliverables\",\"file_sha256\":\"b902931830432583d6c7c9851b7a4623a9dd7d88e0ee3c6b07ad95df2996a59a\",\"content_sha256\":\"473716bd89738d3a2e79b446b73834b54a8ffed3377f6918f78c86d9338a4d32\",\"file_bytes\":5523,\"body_bytes\":4431},{\"atom_id\":\"distinguish-fog-from-ticket\",\"file_sha256\":\"a49401c31c4a910223e0b7d0fedfaf03cef53e4c7f0efe251e62d8eb8d63fac5\",\"content_sha256\":\"ffcc4242afc2528780aff06b9dbe0a31bac9258b15a0380a570678095bf080c7\",\"file_bytes\":2516,\"body_bytes\":1431},{\"atom_id\":\"keep-the-map-an-index\",\"file_sha256\":\"0ab8b6c864e649557bf6234a045fc07c5c69f26fd8a6250f4253552f874d51fd\",\"content_sha256\":\"d126ad46deb7e166047d35b869b7f2d10ab8f076d3462cd66911f399d9f27ec4\",\"file_bytes\":2608,\"body_bytes\":1642}]"
carrier_sha256: 22b773a24315b2a7181951b2dd0d128d5a6d4c904b354582df184d271cd81e5b
carrier_bytes: 10980
revision: 1
status: active
---
<!-- vpmodule:atom:begin chart-decisions-not-deliverables -->
---
instruction_id: chart-decisions-not-deliverables
title: Chart decisions not deliverables
summary: "Chart a large, foggy effort as a shared map of decision tickets and resolve them one at a time, producing decisions rather than deliverables."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: An idea is too big for one session and the way to the destination is not visible.
conditions_does_not_apply_when: The way is already clear and the whole journey fits one session.
artifact_contract_output_type: decision-map
artifact_contract_required_data:
  - destination
  - decision tickets
  - resolutions
artifact_contract_verified_by: the map is done when the way is clear and no tickets remain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/wayfinder/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Chart decisions not deliverables
A loose idea has arrived, too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **shared map** on the repo's issue tracker, then works its **decision tickets** (questions whose resolution is a decision, not slices of a build to execute) one at a time until the route is clear.
The destination varies per effort, and naming it is the first act of charting: it shapes every ticket. It might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place like a data-structure migration.
## Plan, don't do
Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear, with nothing left to decide before someone goes and does the thing. The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off. An effort can override this in its **Notes**, carrying execution into the map itself, but absent that, produce decisions, not deliverables.
## Refer by name
Every map and ticket is an issue, so it has a **name**: its title. In everything the human reads (narration, the map's Decisions-so-far), refer to it by that name, never by a bare id, number, or slug. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and URL don't vanish; a name wraps its link, but they ride _inside_ the name, never stand in for it.
## Invocation
Two modes. Either way, **never resolve more than one ticket per session**, with the exception of research tickets.
### Chart the map
User invokes with a loose idea.
1. **Name the destination.** Grill the idea to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so it's settled first.
2. **Map the frontier.** Grill again, **breadth-first** this time: fan out across the whole space rather than deep on any one thread, surfacing the open decisions and the first steps takeable now. **If this surfaces no fog** (the way to the destination is already clear, the whole journey small enough for one session), you don't need a map. Stop and ask the user how they'd like to proceed.
3. **Create the map**: Destination and Notes filled in, Decisions-so-far empty, the fog sketched into **Not yet specified**.
4. **Create the tickets you can specify now** as child issues of the map, then wire blocking edges in a **second pass** (issues need ids before they can reference each other). Write cross-references in that pass too, with real ids: a placeholder `#<n>` auto-links to an unrelated issue. Wiring sorts them into the frontier and the blocked; everything you can't yet specify stays in the fog: the **Not yet specified** section.
5. **Fire the research subagents.** For each `research` ticket you just created, spin up a subagent with a fresh context window that calls the Skill tool with "research" to resolve it in parallel, capturing its findings on a throwaway branch with a context pointer from the ticket. Push the branch but open no PR: it is never merged.
6. Stop: charting is one session's work; it hand-resolves nothing.
### Work through the map
User invokes with a map (URL or number). A ticket is **optional**: without one, you pick the next decision, not the user.
1. Load the **map**: the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it**: assign it to yourself before any work.
3. Resolve it as the type its `wayfinder:<type>` label names. Read the label, not just the body: the body never states the type. **Zoom as needed**: fetch the full body of any related or closed ticket on demand.
4. Record the resolution: post the answer as a **resolution comment**, **close** the issue, and **append a context pointer** to the map's Decisions-so-far.
5. Add newly-surfaced tickets (create-then-wire); graduate any fog the answer has made specifiable, clearing each graduated patch from **Not yet specified** so it lives only as its new ticket. If the answer reveals that a ticket (this one or another) sits beyond the destination, **rule it out of scope** rather than resolving it on the route. If the decision invalidates other parts of the map, update or delete those tickets.
<!-- vpmodule:atom:end chart-decisions-not-deliverables -->
<!-- vpmodule:atom:begin distinguish-fog-from-ticket -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/wayfinder/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Distinguish fog from ticket
The map is _deliberately_ incomplete: don't chart what you can't yet see. Beyond the live tickets lies the **fog of war**: the dim view of decisions and investigations you can tell are coming but can't yet pin down, because they hang on questions still open. Resolving a ticket clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets, one at a time, until the way to the destination is clear and no tickets remain.
The map's **Not yet specified** section is where that dim view is written down: the suspected question, the area to revisit later. It's the undiscovered frontier _toward_ the destination: everything here is in scope, just not sharp enough to ticket. Write as loosely or as fully as the view allows; it doubles as a signpost for collaborators reading where the effort is headed.
**Fog or ticket?** The test is whether you can state the question precisely now, _not_ whether you can answer it now.
- **Ticket when** the question is already sharp, even if it's blocked and you can't act on it yet.
- **Not yet specified when** you can't yet phrase it that sharply. Don't pre-slice the fog into ticket-sized pieces: it's coarser than a ticket, and one patch may graduate into several tickets, or none, once the frontier reaches it.
**Not yet specified** excludes what's already decided (Decisions so far), what's already a live ticket, and what's out of scope.
<!-- vpmodule:atom:end distinguish-fog-from-ticket -->
<!-- vpmodule:atom:begin keep-the-map-an-index -->
---
instruction_id: keep-the-map-an-index
title: Keep the map an index
summary: "Keep a decision map an index, not a store: a decision lives in exactly one ticket, and the map only gists it and links."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A shared map of decisions is maintained.
conditions_does_not_apply_when: The map is the only place a decision exists.
artifact_contract_output_type: map-index
artifact_contract_required_data:
  - decision lines
  - links to tickets
artifact_contract_verified_by: "no decision is restated in the map, only gisted and linked"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/wayfinder/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the map an index
The map is a single issue on this repo's issue tracker, labelled `wayfinder:map`, the canonical artifact. Its tickets are child issues of the map.
The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold their detail; a decision lives in exactly one place, its ticket, so the map never restates it, only gists it and links.
Each ticket is a **child issue** of the map; the tracker's issue id is its identity. Its body is the question, sized to one agent session:
```
## Question
<the decision or investigation this ticket resolves>
```
Each ticket carries a `wayfinder:<type>` label, one of `research`, `prototype`, `grilling`, `task`. `wayfinder:` labels are the only labels a map and its tickets carry, never a triage label like `ready-for-agent`: they are decisions, not implementation work.
A session **claims** a ticket by assigning it to the dev driving the map, **first**, before any work, so concurrent sessions skip it. That assignee _is_ the claim: an open, unassigned ticket is unclaimed.
Blocking uses the tracker's **native** dependency relationship: essential because it renders the frontier _visually_ in the tracker's own UI, so the human sees what's takeable without opening the map. Only a tracker that lacks native blocking falls back to a body convention. A ticket is **unblocked** when every ticket blocking it is closed; the **frontier** is the open, unblocked, unclaimed children, the edge of the known.
The answer isn't part of the body; it's recorded on resolution. Assets created while resolving a ticket are linked from the issue, not pasted in.
<!-- vpmodule:atom:end keep-the-map-an-index -->