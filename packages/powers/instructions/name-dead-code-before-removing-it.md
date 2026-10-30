---
instruction_id: name-dead-code-before-removing-it
title: Name the dead code before removing it
summary: "After a change, list the code it orphaned explicitly and ask before removing any of it."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A refactoring or implementation change may have left code unreachable or unused.
conditions_does_not_apply_when: Nothing became orphaned.
artifact_contract_output_type: dead-code-list
artifact_contract_required_data:
  - the orphaned elements
  - what replaced each one
  - the request to remove them
artifact_contract_verified_by: every orphaned element is named and nothing was deleted without the answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Name the dead code before removing it

After any refactoring or implementation change, check for orphaned code:

1. Identify code that is now unreachable or unused
2. List it explicitly
3. **Ask before deleting:** "Should I remove these now-unused elements: [list]?"

Don't leave dead code lying around — it confuses future readers and agents. But don't silently delete things you're not sure about.

```
DEAD CODE IDENTIFIED:
- formatLegacyDate() in src/utils/date.ts — replaced by formatDate()
- OldTaskCard component in src/components/ — replaced by TaskCard
- LEGACY_API_URL constant in src/config.ts — no remaining references
→ Safe to remove these?
```
