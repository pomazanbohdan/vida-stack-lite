---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-performance-checklist-md-6952a05f-c02"
title: "addy-skills: references/performance-checklist.md module"
summary: "Carrier for 7 atomic instructions from addy-skills:references/performance-checklist.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/performance-checklist.md\"}"
atom_ids:
  - measure-field-data-before-optimizing
  - put-static-content-near-the-user
  - serve-assets-over-a-cached-fast-path
  - set-latency-and-layout-shift-targets
  - ship-few-fonts-in-one-format
  - size-one-connection-pool-per-process
  - split-response-time-into-stages
atom_count: 7
atoms: "[{\"atom_id\":\"measure-field-data-before-optimizing\",\"file_sha256\":\"59ce6610bb5ad0f8801233d05b08bcf73900a5ee5e34867b88ba3268e5794fde\",\"content_sha256\":\"0cb85b36f950fa30ac2172234a631633d046e42df06679be8b6251a000445ff2\",\"file_bytes\":1656,\"body_bytes\":489},{\"atom_id\":\"put-static-content-near-the-user\",\"file_sha256\":\"3a2c5ea688af41b2004a12ea0a239ffcda01f79ec39ba42a13ef668fec1bd2ed\",\"content_sha256\":\"bd473b62d8d4bdc6bf64d661083d589d8c9a7eb3933ee13e33aafdfe9d09cd11\",\"file_bytes\":1307,\"body_bytes\":190},{\"atom_id\":\"serve-assets-over-a-cached-fast-path\",\"file_sha256\":\"b93e9b340c8da255b73e3ead246a728a977d959b367f337660c0ce68d5e364d8\",\"content_sha256\":\"672cc545a37148c8784c60868c8c60b23b3acf79bccb99cf16638afd4d7477f1\",\"file_bytes\":1524,\"body_bytes\":413},{\"atom_id\":\"set-latency-and-layout-shift-targets\",\"file_sha256\":\"557bb3ee9c0bfd5f3c057fa4b0ec20bf860ae22cb610035f56790a490dde829b\",\"content_sha256\":\"1c140ed8ac22852b638a1ea442255a9659f8cba946799e27743bc69f0f014022\",\"file_bytes\":1362,\"body_bytes\":268},{\"atom_id\":\"ship-few-fonts-in-one-format\",\"file_sha256\":\"b04cefe9ab2aee6dadaa8973c65f04a9244336027e9aa03b9d5002d0dea9a883\",\"content_sha256\":\"75e68732175d4c331cc748a91371a9ac349e2ef90d4961934c6944b64d62e2c6\",\"file_bytes\":1865,\"body_bytes\":787},{\"atom_id\":\"size-one-connection-pool-per-process\",\"file_sha256\":\"532cc98e7c0acfeb368f533722c291e0e1b87507ca525ff674129bbf376da9d2\",\"content_sha256\":\"a9c58d6215f9b96811e26149a63d315bc672043533eb03db4cfe57a20f391a90\",\"file_bytes\":1805,\"body_bytes\":581},{\"atom_id\":\"split-response-time-into-stages\",\"file_sha256\":\"211cc52c05c8b9b02b4bd6f539022aa69125849466c4025d3cc85cece1ae14e2\",\"content_sha256\":\"c70924ec720e68666eefb96f3aacb0cb47b38d726f60415274fc916d6cc2bc03\",\"file_bytes\":1503,\"body_bytes\":402}]"
carrier_sha256: 333df08bf1aa315fa20955cdc18232b0847b28db4dadcdb0ad9249d8d5752ecd
carrier_bytes: 11897
revision: 1
status: active
---
<!-- vpmodule:atom:begin measure-field-data-before-optimizing -->
---
instruction_id: measure-field-data-before-optimizing
title: Measure field data before optimizing
summary: "Real-user data comes first, the slow interaction is found in a recorded trace, and the result is checked on slower hardware before it is called fixed."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: An interface feels slow and the work is about to optimize it.
conditions_does_not_apply_when: The work does not touch a user-visible path.
artifact_contract_output_type: field-data-measurement
artifact_contract_required_data:
  - the field data
  - the recorded slow interaction
  - the hardware the result was checked on
artifact_contract_verified_by: the field data was read first and the slow interaction was reproduced on slower hardware
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Measure field data before optimizing
1. **Field data first** — check [CrUX Vis](https://developer.chrome.com/docs/crux/vis) or your RUM tool for real-user INP before optimising
2. **Identify slow interactions** — open DevTools → Performance panel → record while interacting; look for long tasks triggered by clicks/keystrokes
3. **Test on mid-range Android** — INP issues often only surface on slower hardware; use a real device or DevTools CPU throttling (4×–6× slowdown)
<!-- vpmodule:atom:end measure-field-data-before-optimizing -->
<!-- vpmodule:atom:begin put-static-content-near-the-user -->
---
instruction_id: put-static-content-near-the-user
title: Put static content near the user
summary: "Static assets are served from a CDN, the server sits close to the people who use it, and the deployment scales out with a health check."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A service is deployed or its placement is changed.
conditions_does_not_apply_when: The work deploys no service.
artifact_contract_output_type: deployment-placement-review
artifact_contract_required_data:
  - where the static assets are served from
  - where the server runs
  - the scaling setup
  - the health check
artifact_contract_verified_by: the static assets are served from a CDN and the load balancer has a health check endpoint
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Put static content near the user
CDN for static assets
Server located close to users (or edge deployment)
Horizontal scaling configured (if needed)
Health check endpoint for load balancer
<!-- vpmodule:atom:end put-static-content-near-the-user -->
<!-- vpmodule:atom:begin serve-assets-over-a-cached-fast-path -->
---
instruction_id: serve-assets-over-a-cached-fast-path
title: Serve assets over a cached fast path
summary: "Static assets are cached with a long lifetime and a content hash, the protocol is the fast one, and the known origins are preconnected."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: Assets are served to a client over the network.
conditions_does_not_apply_when: The work ships no assets over the network.
artifact_contract_output_type: asset-delivery-review
artifact_contract_required_data:
  - the cache lifetime of the static assets
  - the protocol
  - the preconnected origins
  - the redirects
artifact_contract_verified_by: every static asset is served with a long cache lifetime and a content hash
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Serve assets over a cached fast path
Static assets cached with long `max-age` + content hashing
API responses cached where appropriate (`Cache-Control`)
HTTP/2 or HTTP/3 enabled
Resources preconnected (`<link rel="preconnect">`) for known origins
`fetchpriority` used on critical non-image resources (e.g., key `<link rel="preload">`, above-the-fold `<script>`) — not only on `<img>`
No unnecessary redirects
<!-- vpmodule:atom:end serve-assets-over-a-cached-fast-path -->
<!-- vpmodule:atom:begin set-latency-and-layout-shift-targets -->
---
instruction_id: set-latency-and-layout-shift-targets
title: Set latency and layout-shift targets
summary: "The interface is judged against written targets for paint, interaction and layout shift, and the API against a written response-time target."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Performance is being judged for a release.
conditions_does_not_apply_when: The work has no performance target.
artifact_contract_output_type: performance-target-review
artifact_contract_required_data:
  - the target for each metric
  - the measured value
  - the verdict
artifact_contract_verified_by: each measured value is compared against its written target and the verdict is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Set latency and layout-shift targets
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
Response times < 200ms (p95)
<!-- vpmodule:atom:end set-latency-and-layout-shift-targets -->
<!-- vpmodule:atom:begin ship-few-fonts-in-one-format -->
---
instruction_id: ship-few-fonts-in-one-format
title: Ship few fonts in one format
summary: "A small number of font families and weights ship in one modern format, self-hosted where possible, with the fallback metrics adjusted."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A page uses custom fonts.
conditions_does_not_apply_when: The page uses only a system font stack.
artifact_contract_output_type: font-loading-review
artifact_contract_required_data:
  - the families and weights
  - the format
  - where the font is served from
  - the fallback metrics
artifact_contract_verified_by: the font budget is stated and every font file is in the one supported format
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Ship few fonts in one format
Limited to 2–3 font families, 2–3 weights each (every additional weight is another request)
WOFF2 format only (smallest, universal support — skip WOFF/TTF/EOT)
Self-hosted when possible (third-party font CDNs add DNS + TCP + TLS round-trips)
LCP-critical fonts preloaded: `<link rel="preload" as="font" type="font/woff2" crossorigin>`
`font-display: swap` (or `optional` for non-critical) to avoid FOIT blocking render
Subsetted via `unicode-range` to ship only the glyphs each page needs
Variable fonts considered when multiple weights/styles are required (one file replaces many)
Fallback font metrics adjusted with `size-adjust`, `ascent-override`, `descent-override` to reduce CLS on font swap
System font stack considered before any custom font
<!-- vpmodule:atom:end ship-few-fonts-in-one-format -->
<!-- vpmodule:atom:begin size-one-connection-pool-per-process -->
---
instruction_id: size-one-connection-pool-per-process
title: Size one connection pool per process
summary: "There is one pool per process, its size stays under the server limit, exhaustion fails fast, and the holder of the connections is found before the pool is resized."
capability_tags:
  - improve-performance
pattern_tags:
  - resource-bounds
conditions_applies_when: A process talks to a database over more than one connection.
conditions_does_not_apply_when: The process holds a single connection or none.
artifact_contract_output_type: pool-sizing-note
artifact_contract_required_data:
  - the number of instances
  - the pool maximum
  - the server limit
  - the timeout
  - what holds connections when the pool is exhausted
artifact_contract_verified_by: the instance count times the pool maximum stays under the server limit and exhaustion fails fast
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Size one connection pool per process
One pool per process, not per request or per module
`instances × pool max` stays under the database's `max_connections`
`connectionTimeoutMillis` set so exhaustion fails fast instead of queueing forever
Exhaustion diagnosed before resizing: find what holds connections (long transactions, missing `await`, leaked clients)
Serverless / autoscaling fronted by a multiplexing proxy (pgbouncer, RDS Proxy) rather than a larger pool
Connection pool per request | Exhausts `max_connections` under load | One pool per process; proxy for serverless
<!-- vpmodule:atom:end size-one-connection-pool-per-process -->
<!-- vpmodule:atom:begin split-response-time-into-stages -->
---
instruction_id: split-response-time-into-stages
title: Split the response time into stages
summary: "A slow first byte is attributed to name resolution, the connection handshake or server processing before anything is changed."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The time to the first byte is slower than the target.
conditions_does_not_apply_when: The time to the first byte is inside the target.
artifact_contract_output_type: latency-stage-diagnosis
artifact_contract_required_data:
  - the stage that is slow
  - the measurement of that stage
  - the change made for it
artifact_contract_verified_by: each stage is measured separately and the slow one is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Split the response time into stages
When TTFB is slow (> 800ms), check each component in DevTools Network waterfall:
- **DNS resolution** slow → add `<link rel="dns-prefetch">` or `<link rel="preconnect">` for known origins
- **TCP/TLS handshake** slow → enable HTTP/2, consider edge deployment, verify keep-alive
- **Server processing** slow → profile backend, check slow queries, add caching
<!-- vpmodule:atom:end split-response-time-into-stages -->