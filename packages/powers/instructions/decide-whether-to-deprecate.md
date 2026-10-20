---
instruction_id: decide-whether-to-deprecate
title: Decide whether to deprecate
summary: "Answer the five questions before removing anything: unique value, consumers, replacement, migration cost, and the cost of not deprecating."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: "A system, API, library or feature is a candidate for removal."
conditions_does_not_apply_when: The removal was already decided and the work is the migration.
artifact_contract_output_type: deprecation-decision
artifact_contract_required_data:
  - unique value
  - number of consumers
  - replacement
  - migration cost per consumer
  - maintenance cost of not deprecating
artifact_contract_verified_by: all five questions are answered in writing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
---

# Decide whether to deprecate

Before deprecating anything, answer these questions:

```
1. Does this system still provide unique value?
   → If yes, maintain it. If no, proceed.

2. How many users/consumers depend on it?
   → Quantify the migration scope.

3. Does a replacement exist?
   → If no, build the replacement first. Don't deprecate without an alternative.

4. What's the migration cost for each consumer?
   → If trivially automated, do it. If manual and high-effort, weigh against maintenance cost.

5. What's the ongoing maintenance cost of NOT deprecating?
   → Security risk, engineer time, opportunity cost of complexity.
```

### Code Is a Liability

Every line of code has ongoing cost: it needs tests, documentation, security patches, dependency updates, and mental overhead for anyone working nearby. The value of code is the functionality it provides, not the code itself. When the same functionality can be provided with less code, less complexity, or better abstractions — the old code should go.
