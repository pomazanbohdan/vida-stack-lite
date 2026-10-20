---
instruction_id: deepen-by-dependency-category
title: Deepen by dependency category
summary: "Deepen a cluster of shallow modules by classifying its dependencies and testing across the new interface, replacing old unit tests rather than layering on top."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A cluster of shallow modules is a deepening candidate.
conditions_does_not_apply_when: "The candidate's dependencies do not allow a deepened interface."
artifact_contract_output_type: deepening-plan
artifact_contract_required_data:
  - dependency categories
  - new interface
  - adapter strategy
artifact_contract_verified_by: the deepened module is tested through its interface and old shallow tests are deleted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/codebase-design/DEEPENING.md
status: active
revision: 1
---

# Deepen by dependency category
When assessing a candidate for deepening, classify its dependencies. The category determines how the deepened module is tested across its seam.
### 1. In-process
Pure computation, in-memory state, no I/O. Always deepenable: merge the modules and test through the new interface directly. No adapter needed.
### 2. Local-substitutable
Dependencies that have local test stand-ins (PGLite for Postgres, in-memory filesystem). Deepenable if the stand-in exists. The deepened module is tested with the stand-in running in the test suite. The seam is internal; no port at the module's external interface.
### 3. Remote but owned (Ports & Adapters)
Your own services across a network boundary (microservices, internal APIs). Define a **port** (interface) at the seam. The deep module owns the logic; the transport is injected as an **adapter**. Tests use an in-memory adapter. Production uses an HTTP/gRPC/queue adapter.
Recommendation shape: *"Define a port at the seam, implement an HTTP adapter for production and an in-memory adapter for testing, so the logic sits in one deep module even though it's deployed across a network."*
### 4. True external (Mock)
Third-party services (Stripe, Twilio, etc.) you don't control. The deepened module takes the external dependency as an injected port; tests provide a mock adapter.
## Seam discipline
- **Internal seams vs external seams.** A deep module can have internal seams (private to its implementation, used by its own tests) as well as the external seam at its interface. Don't expose internal seams through the interface just because tests use them.
## Testing strategy: replace, don't layer
- Old unit tests on shallow modules become waste once tests at the deepened module's interface exist; delete them.
- Write new tests at the deepened module's interface. The **interface is the test surface**.
- Tests assert on observable outcomes through the interface, not internal state.
- Tests should survive internal refactors, since they describe behaviour, not implementation. If a test has to change when the implementation changes, it's testing past the interface.
