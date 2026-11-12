---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-hooks-sdd-cache-md-b76ed60d-c01"
title: "addy-skills: hooks/SDD-CACHE.md module"
summary: "Carrier for 2 atomic instructions from addy-skills:hooks/SDD-CACHE.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"hooks/SDD-CACHE.md\"}"
atom_ids:
  - revalidate-a-cache-before-serving-it
  - show-the-parameters-behind-a-cached-result
atom_count: 2
atoms: "[{\"atom_id\":\"revalidate-a-cache-before-serving-it\",\"file_sha256\":\"936dc2bda647e428838a3ba837611bf7e5bb951a3079faa71416fa1a160b1030\",\"content_sha256\":\"3b798b33985585715c916e0a531c740f1aa79411f740045a794d618dd4f87dbd\",\"file_bytes\":1975,\"body_bytes\":870},{\"atom_id\":\"show-the-parameters-behind-a-cached-result\",\"file_sha256\":\"9b42bdc661237a51a722aebfa323bd8deb92d6cef09eb8075043d3770e128820\",\"content_sha256\":\"fad9e1712d33fa725f0d28059f4cbfcf849336b2c382f1e38a0394096615617b\",\"file_bytes\":1667,\"body_bytes\":477}]"
carrier_sha256: 0360d6ec0f5686000be5badac70570497db7b6368233d65540f5e657d4845c3f
carrier_bytes: 3913
revision: 1
status: active
---
<!-- vpmodule:atom:begin revalidate-a-cache-before-serving-it -->
---
instruction_id: revalidate-a-cache-before-serving-it
title: Revalidate the cache before serving it
summary: "Serve a cached result only after the origin confirms it is unchanged, and never cache an entry that carries no validator."
capability_tags:
  - reuse-cached-sources-safely
pattern_tags:
  - verification-before-completion
conditions_applies_when: A cached copy of something fetched from a remote origin may be reused.
conditions_does_not_apply_when: "Nothing is cached, or the stored copy is itself the source of truth."
artifact_contract_output_type: cache-revalidation
artifact_contract_required_data:
  - origin
  - validator
  - origin response
  - decision
artifact_contract_verified_by: a cached entry is served only on a not-modified response from the origin
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=hooks/SDD-CACHE.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Revalidate the cache before serving it
Skips redundant fetches without weakening the skill's "verify against current docs" guarantee.

Caches fetched content on disk, but **revalidates with the origin server on every reuse** via HTTP `If-None-Match` / `If-Modified-Since`. Content is only served from cache when the server responds `304 Not Modified`, which is a fresh verification — not a memory read.

**Freshness rules:**
- Entry is served only if the origin confirms `304 Not Modified`.
- Entries without an `ETag` or `Last-Modified` header are never cached — without a validator, the cache cannot verify freshness later, and caching would mean trusting memory.

A misbehaving server can serve a wrong `304`. That's a server bug to diagnose, not a cache invariant to defend against; we don't paper over it with a TTL. Delete the entry if you spot a stale one.
<!-- vpmodule:atom:end revalidate-a-cache-before-serving-it -->
<!-- vpmodule:atom:begin show-the-parameters-behind-a-cached-result -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=hooks/SDD-CACHE.md
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
<!-- vpmodule:atom:end show-the-parameters-behind-a-cached-result -->