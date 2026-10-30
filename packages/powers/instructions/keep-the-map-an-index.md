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
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/wayfinder/SKILL.md
status: active
revision: 2
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
