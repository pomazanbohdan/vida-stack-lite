---
instruction_id: record-decisions-as-adrs
title: Record decisions as ADRs
summary: "Record a decision as a short ADR only when it is hard to reverse, surprising without context, and the result of a real trade-off."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A design decision has been made and might need its reasoning later.
conditions_does_not_apply_when: "The decision is easy to reverse, unsurprising, or had no real alternative."
artifact_contract_output_type: adr
artifact_contract_required_data:
  - context
  - decision
  - reason
  - number
artifact_contract_verified_by: the ADR exists only when all three conditions held
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/domain-modeling/SKILL.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/domain-modeling/ADR-FORMAT.md
status: active
revision: 1
---

# Record decisions as ADRs
Offer ADRs sparingly. Only offer to create an ADR when all three are true:
1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons
If any of the three is missing, skip the ADR. If a decision is easy to reverse, skip it: you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."
ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc. Create the `docs/adr/` directory lazily: only when the first ADR is needed. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why*, not in filling out sections. Scan `docs/adr/` for the highest existing number and increment by one.
What qualifies:
- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library: just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite. These stop the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it; otherwise someone will suggest GraphQL again in six months.
