---
instruction_id: trace-the-changed-behavior-to-the-nearest-observable-boundary
title: Trace the changed behavior to the nearest observable boundary
summary: "The changed behavior is traced from the direct callers and the registered entry points, and the trace stops at the nearest boundary where a test would fail."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: The behavior that changed is known and the places that observe it have to be found.
conditions_does_not_apply_when: "No behavior changed, so there is nothing to trace."
artifact_contract_output_type: consumer-trace
artifact_contract_required_data:
  - the entry points
  - the consumers that observe the behavior
  - the boundary the trace stopped at
artifact_contract_verified_by: "every traced consumer is one the changed behavior actually reaches, and the trace stops at a named boundary"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Trace the changed behavior to the nearest observable boundary
Trace the changed behavior to the places that observe it. Start with direct callers and registered entry points (routes, commands, DI), contract consumers (schemas, events, APIs, database readers), and reverse-dependency info if already available.
Follow a path only while the changed behavior is reachable and unverified. Stop when a test at that boundary would fail, the consumer does not observe the changed behavior, or the next hop is guesswork (dynamic dispatch, reflection, outside-repo consumers, etc.).
Prefer the nearest observable boundary, often one to three hops away, especially across contract, integration, or service edges.
If there are more than five similar consumers, group obvious repeats and check representative paths; expand only when a consumer observes the behavior differently.
