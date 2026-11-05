---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: steve-jobs-design-review-behavior
title: Judge design by how it works
summary: "Judge flows, speed and failure states rather than static appearance; review cold start, empty, offline and error recovery; set experience budgets such as a first screen under one second; and reject beauty that fights function."
capability_tags:
  - review-product-design
pattern_tags:
  - behavioral-design
conditions_applies_when: "Reviewing flows, latency and failure behavior."
conditions_does_not_apply_when: A static brand asset with no interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review walks the slowest and failing paths and names the latency budget.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/steve-jobs-design-review/SKILL.md; sha256=0bbfdcaf8d00ab82877a247369ce08b3ac7c2646d08b28d76f93bbe9456fa2ad; locator=skills/steve-jobs-design-review/SKILL.md#L84-L111"
status: active
revision: 1
---

# Judge design by how it works

Judge design by behavior rather than appearance: evaluate flows, speed, failure states, interruptions, and sequences, and treat a beautiful product that stutters, loses work, or confuses on failure as badly designed. Review the slowest moments rather than only the happy path, including cold start, empty state, offline behavior, and error recovery. In a mockup review, demand the interaction and click through states rather than accepting static slides or stills. In a performance review, set experience budgets; the stated budget is first screen under 1 second or the review fails, and a 2-second wait is a design flaw wherever it lives in the stack. 'It just works' is a design specification requiring zero configuration, zero manual, and zero ceremony; reject beauty that fights function. For failure design, walk error, empty, and offline paths and verify that the user knows exactly what to do next, as when a payment fails.
