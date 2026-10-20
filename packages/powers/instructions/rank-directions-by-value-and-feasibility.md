---
instruction_id: rank-directions-by-value-and-feasibility
title: Rank the directions by value and feasibility
summary: Place every direction on a value-by-feasibility matrix and use differentiation to break a tie inside one quadrant.
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Two or more directions have survived evaluation and one has to be chosen.
conditions_does_not_apply_when: Only one direction is on the table.
artifact_contract_output_type: direction-ranking
artifact_contract_required_data:
  - the quadrant of each direction
  - the order the directions are taken in
  - the tiebreak where two share a quadrant
artifact_contract_verified_by: each direction sits in a quadrant and the tiebreak is differentiation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 1
---

# Rank the directions by value and feasibility

When choosing between directions, rank on this matrix:

|                    | High Feasibility | Low Feasibility |
|--------------------|-------------------|-----------------|
| **High Value**     | Do this first     | Worth the risk   |
| **Low Value**      | Only if trivial   | Don't do this    |

Then use differentiation as the tiebreaker between options in the same quadrant.
