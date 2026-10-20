---
instruction_id: place-state-in-the-narrowest-scope-that-works
title: Place state in the narrowest scope that works
summary: "Pick the smallest state scope that fits the need, and stop passing props through components that never read them."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: State has to be placed or moved in a user interface.
conditions_does_not_apply_when: The state is server state owned by the data layer.
artifact_contract_output_type: state-placement
artifact_contract_required_data:
  - the scope chosen
  - what the scope is for
  - the prop chain checked
artifact_contract_verified_by: no state sits in a wider scope than it needs and no prop passes through three levels
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 1
---

# Place state in the narrowest scope that works

**Choose the simplest approach that works:**

```
Local state (useState)           → Component-specific UI state
Lifted state                     → Shared between 2-3 sibling components
Context                          → Theme, auth, locale (read-heavy, write-rare)
URL state (searchParams)         → Filters, pagination, shareable UI state
Server state (React Query, SWR)  → Remote data with caching
Global store (Zustand, Redux)    → Complex client state shared app-wide
```

**Avoid prop drilling deeper than 3 levels.** If you're passing props through components that don't use them, introduce context or restructure the component tree.
