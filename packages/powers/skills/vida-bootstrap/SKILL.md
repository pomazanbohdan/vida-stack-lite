---
name: vida-bootstrap
description: Read the project-document bootstrap for an orchestrator or assigned agent role.
---
# Vida bootstrap

This is a project document. Host skill discovery or installation is not required.
Read the project sidecar and its source map first. An ordinary direct request
without a declared role may use the orchestrator base as an explicit advisory
assumption. A delegated assignment without a valid role or family stops.

Authority descends from host/system permissions, user intent and project policy,
configured policy owners, bootstrap, then assignment. No lower layer expands a
higher one. Missing permissions, material conflicts and UNKNOWN effects retain
their stop boundaries. This document grants no runtime or delivery authority.

Read the orchestrator base for a lead. For an agent read the agent base followed
by exactly one family delta selected by `bootstrap.registry.json`; base-only
selection is inspection, not a complete assignment. Bootstrap precedes stage
instructions. Read `vp-mode` only when the stage and profile require it.
Bootstrap does not depend on Agent runtime, catalog or profile. Read lifecycle
and allocation owners when project policy requires them; a missing mandated
owner blocks dependent work. If none is configured, apply the project's own
authority, scope and stop rules and record the limitation.

The source-local composer may return the same texts; reading or composing does
not launch an agent. From the project root, use `bun packages/powers/skills/vida-bootstrap/scripts/bootstrap.ts --role agent --role-name code-researcher`.
For automated initialization use `--json` and inspect `role`, `complete`,
`defaulted`, `requiresRoleOrFamily`, `tags` and `instructions`. A direct request
may accept a defaulted orchestrator result. A delegated agent may proceed only
when `role` is `agent`, `complete` is `true`, and `requiresRoleOrFamily` is
`false`; otherwise stop and request the role/family. `tags` and `instructions`
keep base-first order; text mode remains the composed documents only.
The lead owns plan, join, integration and final verification. A child receives a
bounded assignment, exact source paths and an inline contract; it must not claim
to have read unavailable sources.
