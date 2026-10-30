---
instruction_id: ratify-a-proposed-decision-only-on-evidence
title: Ratify a proposed decision only on evidence
summary: A decision record stays Proposed until four evidence conditions hold; only then is it flipped to Accepted with a dated ratification section.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A decision record has been sitting in a proposed state and its work has demonstrably shipped.
conditions_does_not_apply_when: "The decision has never shipped, or the record is not in a proposed state."
artifact_contract_output_type: ratification
artifact_contract_required_data:
  - the four evidence conditions and how each is met
  - the new status with the ratification date
  - the dated ratification section holding the evidence
artifact_contract_verified_by: the record carries a dated ratification section and each of the four conditions is shown to hold
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/adr/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ratify a proposed decision only on evidence
A stale `Proposed` is not cosmetic: it tells contributors and agents that live architecture is an unbuilt idea. Fix it — but on evidence, not vibes.
**The bar.** All four must hold before flipping to `Accepted`:
1. The decided mechanism demonstrably **exists** in the tree — name the files, symbols, and tests.
2. The owning issue is closed **as completed**. A closed issue is not proof: `stateReason` of *not planned* / duplicate means the decision was **dropped** (that is `Legacy` or `Retired`, not `Accepted`).
3. **No material part is unshipped.** If the ADR defines phases and one is outstanding, or states its own bar for acceptance and that bar is unmet, it stays `Proposed`.
4. No later ADR supersedes it, and no approved issue already plans its graduation as separate work.
**The procedure.** Set the status to `Accepted — ratified <date> (originally Proposed <date>)`,
add a dated `## Ratification` section holding the evidence,
Then regenerate the index. If the ADR claims to supersede or subsume others, the gate will now demand their back-links — that is the point. Ratify deliberately.
**Two traps worth knowing**:
- **Shipped code is necessary, not sufficient.** Verify the *decision*, not just the code.
- **"Supersedes" is often "subsumes".** Read what the ADR means before the gate makes you act on what it says. The parenthetical was the truth; the field name was wrong.
