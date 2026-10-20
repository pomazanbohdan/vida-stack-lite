---
instruction_id: budget-the-initial-payload
title: Budget the initial payload
summary: "The initial download stays inside a written budget, the heavy parts are split out, and nothing blocks the first render."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A client application is shipped or its dependencies change.
conditions_does_not_apply_when: The work ships no client application.
artifact_contract_output_type: payload-budget-review
artifact_contract_required_data:
  - the initial bundle size
  - the split points
  - the blocking scripts
  - the third-party scripts
artifact_contract_verified_by: the measured initial bundle is inside the budget and no script blocks the first render
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 2
---

# Budget the initial payload
Bundle size under 200KB gzipped (initial load)
Code splitting with dynamic `import()` for routes and heavy features
Tree shaking enabled (verify dependency ships ESM and marks `sideEffects: false`)
No blocking JavaScript in `<head>` (use `defer` or `async`)
Heavy computation offloaded to Web Workers (if applicable)
`React.memo()` on expensive components that re-render with same props
`useMemo()` / `useCallback()` only where profiling shows benefit
Third-party scripts loaded with `async` / `defer`, audited for size, and fronted by a facade when heavy (chat widgets, embeds)
Critical CSS inlined or preloaded
No render-blocking CSS for non-critical styles
No CSS-in-JS runtime cost in production (use extraction)
Large bundles | Slow Time to Interactive | Code split, tree shake, audit deps
