# VIDA agent and plugin source repository

This project-owned sidecar configures the existing Git repository. It is not a
portable runtime instruction owner. The repository has exactly two products:
`agent` at `packages/agent` and `plugin` at `packages/plugin`.

## Source and ownership map

| Layer or concern                             | Authoritative source                                                                                                        | Owner            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Repository layout and distribution intent    | Current attributable user decision in `.agent/work/npm-agent-migration-20260930/WORK.md`                                    | Repository owner |
| Agent system behavior                        | `packages/agent/docs/system-specification.md`                                                                               | Agent maintainer |
| Agent lifecycle and verification             | `packages/agent/instructions/`, `packages/agent/TESTING.md`                                                                 | Agent maintainer |
| Agent installation guide                     | `packages/agent/docs/installation.md` (derived guide, not a second specification)                                           | Agent maintainer |
| Agent research evidence                      | `packages/agent/docs/research/` (facts and open questions, not runtime receipts)                                            | Agent maintainer |
| Agent implementation and executable evidence | `packages/agent/src/`, `packages/agent/bin/`, `packages/agent/schemas/`, `packages/agent/tests/`, `packages/agent/tooling/` | Agent maintainer |
| Plugin business intent                       | `packages/plugin/docs/business-requirements.md`                                                                             | Plugin owner     |
| Plugin system behavior                       | `packages/plugin/docs/system-specification.md`                                                                              | Plugin owner     |
| Plugin acceptance                            | `packages/plugin/docs/acceptance.md`                                                                                        | Plugin owner     |
| Plugin code and verification                 | `packages/plugin/`, as declared by its current system specification                                                         | Plugin owner     |
| Repository-only migration verification       | `tooling/agent/`, `tests/agent/`                                                                                            | Agent maintainer |
| Project registry and configuration           | Root `agent-runtime.config.v1.yaml` and bound documentation policy                                                          | Repository owner |

Plugin canonical documents are filled by the Plugin owner under a fresh scope.
Their absence is an explicit setup gap, not permission to import old work as law.
One writer owns overlapping shared root configuration and workspace files.

## Runtime and distribution

- Source package: `packages/agent`, npm name `vida-agent`.
- Primary consumer installation is one native executable per supported OS/CPU,
  embedding pinned Bun 1.4.2. Direct installation and first run require no
  external Node, npm or Bun and no runtime download. npm `vida-agent` and all
  existing public SDK exports remain separately maintained compatibility surfaces.
  Native target support requires actual full-product evidence; publication is
  outside local preparation and qualification.
- Package-owned schemas, templates and instructions resolve from the installed
  package. Project YAML, products and operational state resolve from explicit
  consumer `--project-root`; consumers do not contain copied agent source.
- Repository projects are `agent=packages/agent` and `plugin=packages/plugin`.
- Root agent instructions are generated from the maintained package template.
- Work and coordination live under `.agent/`; scratch and asynchronous output
  live under `.tmp/`, outside sealed package payloads. Measure control latency
  separately from actual elapsed execution time.

## Source package Git policy

The repository owner's standing explicit instruction authorizes and requires
this Source repository's orchestrating release session to commit the qualified
Source payload and perform an ordinary, non-force push after EACH successful
package formation. Failed package formation is not a release; preserve its
pending operation and do not use it as this Git trigger. This exception applies
only to this Source repository, not Crea or other consumer repositories.

Finish Source changes, prepare the candidate version and run qualifying checks;
form the exact target release assets once; then commit that Source payload and
push; then seal the same operation's exact archive, obtain three fresh blind
reviews, reverse validation and CLEAR against those sealed bytes, record
assurance, and install the exact qualified assets through their declared
delivery manifest. Release qualification binds current declared source-file
bytes and the exact archive, not Git HEAD or commit metadata. Ordinary commit/
push with unchanged included bytes does not invalidate that binding. Changes to
included source inputs or archive bytes invalidate their affected qualification.
Use public returned identities and operation state; do not manually replay
integrity values. Exact operation retries retain the pending archive and avoid
duplicate effects. Any source-only bootstrap exception is operational
provenance for the already-authorized repair only; it does not create a
standing bypass. Subsequent Source work uses supported retirement/release
methods and current ownership checks.

The release CLI itself performs no Git operation. The orchestrating session is
the authorized Git caller. This scoped standing instruction satisfies the Git
permission requirement independently of user Runtime acceptance; it does not
waive assurance or grant Runtime acceptance. Generic consumer lifecycle and Git
approval rules are unchanged. Attribution is retained in the current
`.agent/work/audit-36-absorption-release-20261001/WORK.md`; this section is the
Source-specific instruction owner.

## Validation and safety

Agent checks are owned by `packages/agent/TESTING.md` and its package scripts.
Use the pinned Bun launcher for build, type/static/format, ordinary, packed,
extracted and retained behavior checks. Numeric quality gaps remain explicit;
Static evidence never grants Runtime acceptance. Plugin commands are declared
by its owner after the product specification is present.

Preserve `.git`, history, origin and unrelated files. The predecessor runtime
is inactive provenance in `.tmp/archive`, never an active fallback. Do not
merge predecessor schemas or code into the current product. Existing consumer
v10 remains until the selected distribution, public CLI and fenced artifact
repair are verified. Existing tasks are retained as inactive provenance, not migrated.
