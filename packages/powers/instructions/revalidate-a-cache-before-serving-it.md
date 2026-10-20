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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=hooks/SDD-CACHE.md
status: active
revision: 1
---

# Revalidate the cache before serving it
Skips redundant fetches without weakening the skill's "verify against current docs" guarantee.

Caches fetched content on disk, but **revalidates with the origin server on every reuse** via HTTP `If-None-Match` / `If-Modified-Since`. Content is only served from cache when the server responds `304 Not Modified`, which is a fresh verification — not a memory read.

**Freshness rules:**
- Entry is served only if the origin confirms `304 Not Modified`.
- Entries without an `ETag` or `Last-Modified` header are never cached — without a validator, the cache cannot verify freshness later, and caching would mean trusting memory.

A misbehaving server can serve a wrong `304`. That's a server bug to diagnose, not a cache invariant to defend against; we don't paper over it with a TTL. Delete the entry if you spot a stale one.
