---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-vitals
title: Optimize Core Web Vitals
summary: "Optimize LCP, INP and CLS as user-facing milestones; fix TTFB and FCP first, use RUM in production and fail CI when a vital regresses past its threshold."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - core-web-vitals
conditions_applies_when: A metric in the red or a performance-budget gate.
conditions_does_not_apply_when: A page with no field metrics or user interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "LCP, INP, CLS, TTFB and FCP each have a measured value and a fix or gate."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L123-L146"
status: active
revision: 1
---

# Optimize Core Web Vitals

Core Web Vitals optimization: Core Web Vitals (LCP, INP, CLS) are Google's user-centric metrics covering loading, interactivity, and visual stability; they impact search ranking and reflect real user experience. A fast TTFB means nothing if the hero image still loads late (LCP) or main-thread JavaScript blocks interactions (INP), so optimize perceived milestones rather than the byte-delivery clock. For LCP, optimize the largest visible element (hero image, heading block, video poster) and preload it with fetchpriority="high"; for INP, keep the main thread free and break long tasks (scheduler.yield() or setTimeout chunking) so every interaction stays responsive; for CLS, reserve space for dynamic content before it loads via explicit image dimensions or CSS aspect-ratio; TTFB and FCP (<1.8s) are upstream gates that bound every downstream milestone so fix them first; measure with Real User Monitoring in production because lab/synthetic tests miss real-device and network variance; enforce budgets by failing CI (e.g., Lighthouse CI assertions) when a vital regresses past its Quick Diagnostic threshold.
