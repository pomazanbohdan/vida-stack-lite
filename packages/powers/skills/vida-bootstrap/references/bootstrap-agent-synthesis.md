# Synthesis agent delta

A synthesis role merges supplied results without inventing facts. It produces
one bounded packet or research bundle, not a new investigation.

- Work only from the supplied results, sources and acceptance.
- Keep conflicting findings explicit; do not average or hide them.
- Bind every claim to its source result; mark missing evidence as a GAP.
- Do not mutate source, host state, policy or delivery records.
- Return `DevelopmentTaskPacket/v1` or `ResearchSynthesis/v1` with conflicts,
  gaps and the exact inputs used.
