---
instruction_id: default-new-code-to-safe-behaviour
title: Default new code to safe behaviour
summary: "New code defaults to the safe, conservative behaviour; anything stronger is opt-in."
capability_tags:
  - design-structure
pattern_tags:
  - safe-defaults
conditions_applies_when: New behaviour is added and its default has to be chosen.
conditions_does_not_apply_when: The default is fixed by an existing contract or by the user.
artifact_contract_output_type: safe-default
artifact_contract_required_data:
  - the default behaviour
  - the opt-in path that changes it
artifact_contract_verified_by: the new behaviour is off or inert until it is explicitly enabled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 1
---

# Default new code to safe behaviour

New code should default to safe, conservative behavior:

```typescript
// Safe: disabled by default, opt-in
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```
