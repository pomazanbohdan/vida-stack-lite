---
instruction_id: reframe-vague-requirements-as-success-criteria
title: Reframe vague requirements as success criteria
summary: "Translate a vague requirement into concrete, testable conditions and confirm those targets before the work continues."
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: "A requirement is expressed as a wish, such as faster, better or more robust."
conditions_does_not_apply_when: The requirement already states a measurable condition.
artifact_contract_output_type: success-criteria
artifact_contract_required_data:
  - the original requirement
  - the reframed criteria
  - the confirmation question
artifact_contract_verified_by: each reframed criterion can be checked and was confirmed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/spec-driven-development/SKILL.md
status: active
revision: 1
---

# Reframe vague requirements as success criteria
Start with a high-level vision. Ask the human clarifying questions until requirements are concrete.

**Reframe instructions as success criteria.** When receiving vague requirements, translate them into concrete conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

This lets you loop, retry, and problem-solve toward a clear goal rather than guessing what "faster" means.
