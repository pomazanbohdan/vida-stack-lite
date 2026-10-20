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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/finish-an-epic.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/assets/sample-skill/SKILL.md
status: active
revision: 3
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

Document decisions, not just code. The most valuable documentation captures the *why* — the context, constraints, and trade-offs that led to a decision. Code shows *what* was built; documentation explains *why it was built this way* and *what alternatives were considered*. This context is essential for future humans and agents working in the codebase.

### ADR Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.

A 10-minute ADR prevents a 2-hour debate about the same decision six months later.
Verify proposals like any claim, then ask the user about each, interactively only, and record the answer beside the proposal.
The review proposes; you decide what runs.
Nothing touches your code or your specs automatically.
Spec reconciliations arrive with the evidence attached, for you to apply to the project contract by hand.
An uncertain interpretation never gets written into a spec on its own.
Decision records (ADRs) are written beside the code they govern only when you approve each one, and committing them is up to you.
Each option gets one line on why it lost.
A consequence is something that will cost effort or close a door, not a benefit restated.
