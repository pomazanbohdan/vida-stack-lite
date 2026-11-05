---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-realtime
title: Choose the real-time transport
summary: "Use WebSocket for bidirectional flows, SSE for server-to-client push and polling only as a fallback; send heartbeats, reconnect with exponential backoff, queue offline messages and scale behind a pub/sub broker."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - realtime-transport
conditions_applies_when: A live feature with continuous data flow.
conditions_does_not_apply_when: A request-response feature with no live updates.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The transport matches the data direction and resilience rules are recorded.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L147-L170"
status: active
revision: 1
---

# Choose the real-time transport

Real-time communication: when data must flow continuously, the transport choice among WebSocket, SSE, and long polling determines latency, resource usage, and scalability; match the transport to data-flow direction and frequency rather than defaulting to the most powerful option. WebSocket is bidirectional full-duplex with ~2-byte framing (use for chat, gaming, collaborative editing) but each WebSocket is a separate TCP connection that bypasses HTTP/2 multiplexing; SSE offers simpler server-to-client push over plain HTTP with auto-reconnect (use for live feeds and notifications); long polling is a fallback only due to high overhead from repeated HTTP requests. Send heartbeat/ping frames because mobile networks silently drop idle connections; reconnect with exponential backoff (e.g., 1s, 2s, 4s, 8s capped at 30s) and queue messages while disconnected; scale WebSocket fan-out behind a pub/sub broker such as Redis Pub/Sub or NATS.
