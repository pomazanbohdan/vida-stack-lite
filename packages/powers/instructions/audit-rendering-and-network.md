---
instruction_id: audit-rendering-and-network
title: Audit the rendering and the network path
summary: "Check the rendering and the network path of a web page: re-renders, long lists, layout thrashing, caching, compression and the request pattern."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A web page or component is audited for rendering and network performance.
conditions_does_not_apply_when: The deliverable is not a web page.
artifact_contract_output_type: rendering-network-audit
artifact_contract_required_data:
  - finding
  - area
  - location
  - recommendation
artifact_contract_verified_by: each finding names a location and a recommendation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/web-performance-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Audit the rendering and the network path
## Rendering / JavaScript
- Are there unnecessary full-page re-renders? Is state lifted (or colocated) correctly?
- Are long lists virtualized?
- Are animations using `transform` and `opacity` (compositor-only)?
- Is there layout thrashing (reading layout properties, then writing, in a loop)?
- Is `content-visibility: auto` used for off-screen sections?
- Is the **View Transitions API** used appropriately to avoid perceived CLS on SPA navigations?
- Is **bfcache** preserved? (No `unload` handlers, no `Cache-Control: no-store` on HTML)
- **AI-generated patterns:**
  - State duplication instead of lifting state.
  - `React.memo` / `useMemo` / `useCallback` wrapping everything "just in case" (cost without benefit; can hurt perf).
  - Over-eager `useEffect` dependencies causing redundant re-renders or update loops.
  - **Vue:** watchers (`watch`/`watchEffect`) with broad dependencies that trigger unnecessary updates; `computed` with side effects.
  - **Angular:** `ChangeDetectionStrategy.Default` where `OnPush` would suffice; subscriptions without `takeUntil`/`async pipe` that accumulate listeners.
  - **Svelte:** `$:` blocks with expensive logic that re-runs more than needed.
  - **Vanilla:** `scroll`/`resize` listeners without `passive: true` or debounce; DOM manipulation inside a loop that forces repeated reflow.

## Network
- Are static assets cached with long `max-age` + content hashing?
- Is HTTP/2 or HTTP/3 enabled?
- Are there unnecessary redirects?
- Are API responses paginated? Any `SELECT *` or unbounded fetch patterns?
- Are bulk operations used instead of loops of individual API calls?
- Is response compression enabled (gzip/brotli)?
- **AI-generated patterns:**
  - Over-fetching data "just in case."
  - Sequential `await`s when `Promise.all` (or parallel `fetch`) would work.
  - Redundant API calls where one would suffice; missing deduplication on parallel requests.
