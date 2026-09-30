# Agent allocation

The current session owns planning and overlapping writes by default. Logical
roles are perspectives, not automatically separate processes. Spawn a bounded
specialist only when an independent task has a frozen input, disjoint write
scope or read-only mandate, a concrete output and a defined join. Independent
plan, correctness, security and evidence reviews use fresh history-isolated
agents after the payload is sealed. Reviewers do not write the reviewed code.

The project YAML selects roles, model profiles, tools, workflow stages, write
policy and operations. An assignment is valid only when its role and operation
are configured, its work and project binding match the host checkpoint, and
its capability is issued by the trusted host. The runtime does not infer
model, command or authorization defaults from this document. Changes to YAML
block running attempts until explicit rebind.

Keep one writer on each exact shared file. The host-owned coordination ledger
and work checkpoint jointly govern ticket, claim, lease and release state;
neither a model declaration nor a filesystem lock grants ownership. Acquire
the current ticket's exact resources through typed operations and CAS. A
queued or foreign live claim blocks writes. An expired claim is recovered
through an attributable typed operation, not by editing ledger JSON. Do not
create an alternate worktree to evade FIFO ownership. The trusted host owns
maintenance fencing and rejects stale leases after restart.

An agent dispatch binds source, scope, configuration, schemas, bundle,
project, work, attempt and lease digests. The host validates these bindings
before a provider side effect and when the result returns. Unknown outcomes
remain blocked; an untrusted worker cannot declare no-effect, acceptance or
approval. Agent results are evidence for host validation, not state changes by
themselves.

Use Ponytail only in code-producing execution and debugging, lightly in
implementation planning, and never to trim business meaning, independent
verification or security review. Research agents inspect sources without
writing; the primary session remains the sole writer when paths overlap.

Reduce execution steps by combining discovery questions and reusing fresh
source-bound evidence. Do not repeat final assurance unless affected bytes,
scope, contracts, configuration or schemas change. Record real before/after
step counts when claiming an optimization.
