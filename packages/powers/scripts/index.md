# Vida Powers scripts

This directory contains product development and maintenance tools. Run commands
from the repository root with the package's pinned Bun version. The command
reference and current limits are in [AGENTS.md](../AGENTS.md#4-commands).

| File | Purpose |
| --- | --- |
| [audit-report.ts](audit-report.ts) | Builds corpus, relationship, fidelity and specification reports for the audit CLI. |
| [audit.ts](audit.ts) | Runs the corpus audit CLI and optionally writes report output. |
| [build-manifests.ts](build-manifests.ts) | Plans, checks and builds selected host manifests from package inputs. |
| [check-corpus.ts](check-corpus.ts) | Checks the catalog, instruction corpus and related metadata. |
| [check-format.ts](check-format.ts) | Runs the formatting check for package development metadata. |
| [check-okf.ts](check-okf.ts) | Checks the product documentation bundle against Open Knowledge Format. |
| [convert.ts](convert.ts) | Prepares and applies instruction and corpus conversions with reconciliation. |
| [definitions.ts](definitions.ts) | Collects requirement definitions and detects duplicate identifiers. |
| [formation-payload.ts](formation-payload.ts) | Plans and encodes the files and receipt for a formation payload. |
| [packet.ts](packet.ts) | Checks proposal-packet bindings, parser results and supported recorded claims. |
| [review-migration-plan.ts](review-migration-plan.ts) | Checks the mechanical bindings and current state of a prepared or applied migration plan. |
| [source-packets.ts](source-packets.ts) | Captures, validates and seals source-bound evidence packets. |
| [validate-donors.ts](validate-donors.ts) | Checks donor manifest records and their local clone revisions. |

`packet.ts` and `review-migration-plan.ts` are read-only mechanical checks;
their output does not establish semantic correctness or authorize an apply.
`convert.ts`, `build-manifests.ts`, `source-packets.ts`, and optional audit
output can write files. Consult their current contracts before use.
