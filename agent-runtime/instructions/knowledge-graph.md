# Native GSD knowledge graph

GSD Core Graphify is a derived relationship index consumed by GSD researchers
and planners. Canonical business requirements, system specifications, code,
tests and attributable evidence remain in the sidecar-routed sources. Backlog
remains a derived work ledger; Graphify remains a derived project map.

## Lifecycle use

1. At BOOT/TRACE, read `graphify status`. When the graph exists and is fresh,
   query only the concepts needed for impact and source discovery.
2. A missing graph triggers ordinary sidecar-routed source inspection. A graph
   older than the freshness boundary, behind Git HEAD, `running`, or `failed`
   is approximate and must be corroborated from current sources.
3. During PLAN, graph neighbours and paths may identify candidate dependencies,
   callers, tests and documentation. They do not add scope or acceptance unless
   canonical sources confirm the relationship.
4. After an implementation is tested, refresh the graph through the official
   GSD Graphify build path. Use `graphify diff` as architecture-impact evidence
   for the three reviewers; a topology diff never replaces code diff, tests or
   BR/SR/AC comparison.
5. At RECONCILE, record real graph freshness/build failures as GAPs. Generated
   `.planning/graphs/**` and `graphify-out/**` are disposable projections.

## Safety and ownership

- Use the installed GSD Core `graphify` capability and its supported local
  builder. The default repository build is local AST extraction plus local
  clustering with placeholder community labels; it sends no documentation to
  an LLM. Do not create another graph engine, external database, standalone
  `.gsd-graph/` authority, or graph MCP when native Graphify is sufficient.
- Keep automatic update enabled only when the installed GSD hook/builder is
  verifiably active. If it is missing, perform a foreground refresh at the
  lifecycle boundary and keep an explicit capability GAP.
- Constrain discovery with repository-owned `.graphifyignore`. The portable
  first-stage graph indexes selected code, contracts and schemas. Read B/S and
  human documentation directly through the sidecar; do not infer a semantic
  B→S→C ontology from a code-only graph. Expand semantic/document extraction
  only through a later explicit architecture decision with privacy, provider,
  provenance and review gates.
- Treat EXTRACTED relations as navigation evidence, and INFERRED/AMBIGUOUS
  relations as hypotheses requiring source corroboration. Context trimming
  removes lower-confidence relations before EXTRACTED relations.
- Graph query, status and diff are read-only. Build/update mutates only derived
  graph artifacts and cannot authorize implementation, delivery or Runtime
  acceptance.
