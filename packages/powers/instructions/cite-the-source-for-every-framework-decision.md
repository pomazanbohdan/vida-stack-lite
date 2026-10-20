---
instruction_id: cite-the-source-for-every-framework-decision
title: Cite the source for every framework decision
summary: "Give every framework-specific pattern a citation with a full URL, and say plainly when no documentation was found."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A framework-specific pattern is delivered in code or in an explanation.
conditions_does_not_apply_when: "The decision is not framework-specific, such as a project-specific naming choice."
artifact_contract_output_type: cited-decision
artifact_contract_required_data:
  - the pattern
  - the source URL
  - the quoted passage for a non-obvious decision
  - the unverified marker when nothing was found
artifact_contract_verified_by: every framework-specific pattern carries a citation the reader can open
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/source-driven-development/SKILL.md
status: active
revision: 1
---

# Cite the source for every framework decision

### Step 4: Cite Your Sources

Every framework-specific pattern gets a citation. The user must be able to verify every decision.

**In code comments:**

```typescript
// React 19 form handling with useActionState
// Source: https://react.dev/reference/react/useActionState#usage
const [state, formAction, isPending] = useActionState(submitOrder, initialState);
```

**In conversation:**

```
I'm using useActionState instead of manual useState for the
form submission state. React 19 replaced the manual
isPending/setIsPending pattern with this hook.

Source: https://react.dev/blog/2024/12/05/react-19#actions
"useTransition now supports async functions [...] to handle
pending states automatically"
```

**Citation rules:**

- Full URLs, not shortened
- Prefer deep links with anchors where possible (e.g. `/useActionState#usage` over `/useActionState`) — anchors survive doc restructuring better than top-level pages
- Quote the relevant passage when it supports a non-obvious decision
- Include browser/runtime support data when recommending platform features
- If you cannot find documentation for a pattern, say so explicitly:

```
UNVERIFIED: I could not find official documentation for this
pattern. This is based on training data and may be outdated.
Verify before using in production.
```

Honesty about what you couldn't verify is more valuable than false confidence.

## Red Flags

- Using "I believe" or "I think" about an API instead of citing the source
- Delivering code without source citations for framework-specific decisions
