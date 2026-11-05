---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-quick-diagnostic
title: Run the performance diagnostic
summary: "Check TTFB 800ms, LCP 2.5s, INP 200ms, CLS 0.1, content-hashed caching, HTTP/2+, render-blocking resources and compression; apply the listed action for each no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a web page.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L184-L196"
status: active
revision: 1
---

# Run the performance diagnostic

Quick Diagnostic — eight pass/fail checks, each with a required action on failure: (1) TTFB under 800ms — else CDN, server caching, check backend; (2) LCP under 2.5s — else preload the LCP resource and set fetchpriority="high"; (3) INP under 200ms — else break long tasks and defer non-critical JS; (4) CLS under 0.1 — else explicit dimensions and reserved space; (5) static assets content-hashed and cached — else hashed filenames plus Cache-Control: immutable; (6) HTTP/2 or HTTP/3 enabled — else enable HTTP/2 on server and HTTP/3 via CDN; (7) render-blocking resources minimized — else inline critical CSS, defer scripts, prune unused CSS; (8) compression enabled (Brotli preferred, Gzip fallback) — else enable on server/CDN. These eight rows are the basis for the Scoring bands.
