---
instruction_id: show-the-parameters-behind-a-cached-result
title: Show the parameters behind a cached result
summary: "Keep the parameters that produced a cached result with it and surface them on every hit, so the next reader can judge whether it still applies."
capability_tags:
  - reuse-cached-sources-safely
pattern_tags:
  - verification-before-completion
conditions_applies_when: A cached result was produced by a request that carried parameters of its own.
conditions_does_not_apply_when: The cached result is a byte-for-byte copy of the origin with no processing.
artifact_contract_output_type: cached-result-provenance
artifact_contract_required_data:
  - cached result
  - parameters that produced it
  - reuse or re-fetch decision
artifact_contract_verified_by: the parameters travel with the cached result and are shown on every hit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=hooks/SDD-CACHE.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Show the parameters behind a cached result
The stored body is not raw HTML — the fetch post-processes each response through a model using the caller's prompt, so what we cache is one agent's reading of the page.

Cache key is `sha256(url)`. The same URL asked with a different prompt hits the same entry; the cached body reflects the prompt used on the first fetch, and that prompt is shown alongside the hit so the agent can decide whether to re-use or re-fetch manually.
