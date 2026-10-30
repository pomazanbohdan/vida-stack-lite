---
instruction_id: call-it-a-stub-only-when-the-empty-value-reaches-the-user
title: Call it a stub only when the empty value reaches the user
summary: An empty literal is a stub only when it reaches the rendered output and nothing else fills it; a type default or a state that is overwritten is not a stub.
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: A pattern match on an empty value has been found in a changed file.
conditions_does_not_apply_when: The pattern match is not an empty value at all.
artifact_contract_output_type: finding
artifact_contract_required_data:
  - the pattern that matched
  - whether the value reaches the output
  - what else populates it
artifact_contract_verified_by: the stub verdict names the path to the output and the other code path that fills the value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Call it a stub only when the empty value reaches the user
**Stub classification:** A grep match is a STUB only when the value flows to rendering or user-visible output AND no other code path populates it with real data. A test helper, type default, or initial state that gets overwritten by a fetch/store is NOT a stub. Check for data-fetching (useEffect, fetch, query, useSWR, useQuery, subscribe) that writes to the same variable before flagging.
