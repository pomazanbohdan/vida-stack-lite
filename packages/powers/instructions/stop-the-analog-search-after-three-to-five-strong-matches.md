---
instruction_id: stop-the-analog-search-after-three-to-five-strong-matches
title: Stop the analog search after three to five strong matches
summary: A handful of good matches is enough; the search stops and the range that was already read is not read again.
capability_tags:
  - communicate-concisely
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: Existing files are searched for the pattern to follow.
conditions_does_not_apply_when: No match was found yet and the search space is barely explored.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the matches found
artifact_contract_verified_by: the search stopped within the bound and no range was read twice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-pattern-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-pattern-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Stop the analog search after three to five strong matches
Stop analog search once you have 3–5 strong matches. There is no benefit to finding a 10th analog.
Stop at 3–5 analogs: Once you have enough strong matches, write PATTERNS.md. Broader search produces diminishing returns and wastes tokens.
Never re-read a range already in context.
For small files (≤ 2,000 lines), one `Read` call is enough — extract everything in that pass.
