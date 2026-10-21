---
instruction_id: infer-trust-from-objective-signals-not-from-a-stored-score
title: "Infer trust from objective signals, not from a stored score"
summary: "Trust is inferred from objective per-source signals; no credibility score is stored, and a usage count is read as liveness and trend rather than as a ranking."
capability_tags:
  - research-primary-sources
pattern_tags:
  - trust-signals
conditions_applies_when: A consumer judges how far to trust a concept by the sources it was extracted from.
conditions_does_not_apply_when: The judgement is about who may read the document rather than about how credible it is.
artifact_contract_output_type: trust-signals
artifact_contract_required_data:
  - the signals of each source
  - the usage window
  - the reading of the usage count
artifact_contract_verified_by: no credibility score is stored and the usage count is read as liveness and trend
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Infer trust from objective signals, not from a stored score
The format records objective, per-source signals so a consumer can judge how much to trust a concept by judging the sources it was extracted from.
It does not store a credibility score: a score is subjective, unportable across consumers, and goes stale.
Each signal is optional and lives on a `sources` entry:
- `author`: Who or what produced the source, in the actor convention (§7).
An authority signal.
- `usage_count`: How often `resource` was exercised (dashboard views, query executions, page reads) over `usage_window`.
- `last_modified`: When the source itself last changed.
- `usage_window`: Written once as a sibling of `sources`, it frames every `usage_count` with a `{ from, to }` datetime range.
A single entry MAY carry its own `usage_window` to override the shared one.
`usage_count` is a coarse signal.
It is comparable at the alive-versus-dead and order-of-magnitude level, and against a source's own history over time, but not as a precise cross-kind ranking: a scheduled query's executions and a human's deliberate dashboard views do not carry equal weight.
Consumers SHOULD read it as liveness and trend, not as a score.
