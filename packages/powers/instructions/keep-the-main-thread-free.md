---
instruction_id: keep-the-main-thread-free
title: Keep the main thread free
summary: "Long tasks are broken up and yielded to the browser, non-urgent work waits for an idle moment, and rendering never forces a synchronous layout."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: An interaction feels slow or the main thread is busy in the browser.
conditions_does_not_apply_when: The work runs no user interface.
artifact_contract_output_type: main-thread-review
artifact_contract_required_data:
  - the long tasks found
  - where the work yields
  - the deferred work
  - the rendering changes
artifact_contract_verified_by: no task on the main thread runs longer than the stated limit without yielding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 2
---

# Keep the main thread free
Long tasks (> 50ms) broken up to keep the main thread available — main lever for INP
`yieldToMain` pattern used inside long-running loops so input events can run between chunks
Modern scheduling APIs used where available: `scheduler.yield()` (preferred), `scheduler.postTask()` with priorities, `isInputPending()` to yield only when needed
`requestIdleCallback` for deferrable, non-urgent work (analytics flush, prefetch, warmup)
Non-critical work deferred out of event handlers (e.g. analytics, logging) so the response to the interaction is not delayed
No layout thrashing (forced synchronous layouts)
Animations use `transform` and `opacity` (GPU-accelerated)
Long lists use virtualization (e.g., `react-window`)
No unnecessary full-page re-renders
Off-screen sections use `content-visibility: auto` with `contain-intrinsic-size` to skip layout/paint of non-visible areas
No `unload` event handlers and no `Cache-Control: no-store` on HTML responses — preserves back/forward cache (bfcache) eligibility
Blocking main thread | Poor INP, unresponsive UI | Chunk long tasks with `scheduler.yield()` / `yieldToMain`, offload to Web Workers
Layout thrashing | Jank, dropped frames | Batch DOM reads, then batch writes
