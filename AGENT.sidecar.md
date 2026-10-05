# VIDA agent and plugin source repository

This project-owned sidecar configures the existing Git repository. It is not a
portable runtime instruction owner. The repository has exactly two products:
`agent` at `packages/agent` and `plugin` at `packages/plugin`.

## Source and ownership map

| Layer or concern                             | Authoritative source                                                                                                              | Owner            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Repository layout and distribution intent    | Current attributable user decision in `.agent/work/core-cloud-continuation-20261002/WORK.md#native-only-public-delivery-decision` | Repository owner |
| Agent system behavior                        | `packages/agent/docs/system-specification.md`                                                                                     | Agent maintainer |
| Agent lifecycle and verification             | `packages/agent/instructions/`, `packages/agent/TESTING.md`                                                                       | Agent maintainer |
| Agent installation guide                     | `packages/agent/docs/installation.md` (derived guide, not a second specification)                                                 | Agent maintainer |
| Agent research evidence                      | `packages/agent/docs/research/` (facts and open questions, not runtime receipts)                                                  | Agent maintainer |
| Agent implementation and executable evidence | `packages/agent/src/`, `packages/agent/bin/`, `packages/agent/schemas/`, `packages/agent/tests/`, `packages/agent/tooling/`       | Agent maintainer |
| Plugin business intent                       | `packages/plugin/docs/business-requirements.md`                                                                                   | Plugin owner     |
| Plugin system behavior                       | `packages/plugin/docs/system-specification.md`                                                                                    | Plugin owner     |
| Plugin acceptance                            | `packages/plugin/docs/acceptance.md`                                                                                              | Plugin owner     |
| Plugin code and verification                 | `packages/plugin/`, as declared by its current system specification                                                               | Plugin owner     |
| Repository-only migration verification       | `tooling/agent/`, `tests/agent/`                                                                                                  | Agent maintainer |
| Repository-only CI evidence join             | `tooling/agent/release-ci-evidence.mjs` and its trusted session/controller observation boundary                                   | Agent maintainer |
| Native build artifact and Windows first-install delivery | `.github/workflows/agent-native-delivery.yml`, `tooling/agent/native-ci-delivery.mjs`, `packages/agent/tooling/install-windows.ps1` | Agent maintainer |
| Project registry and configuration           | Root `agent-runtime.config.v1.yaml` and bound documentation policy                                                                | Repository owner |

Plugin canonical documents are filled by the Plugin owner under a fresh scope.
Their absence is an explicit setup gap, not permission to import old work as law.
One writer owns overlapping shared root configuration and workspace files.

## Runtime and distribution

- Source package: `packages/agent`, npm name `vida-agent`.
- Primary consumer installation is one native executable per supported OS/CPU,
  embedding pinned Bun 1.4.2. Direct installation and first run require no
  external Node, npm or Bun and no runtime download. This executable is the only
  public agent delivery. Existing public SDK exports remain library interfaces;
  Public agent CLI installation through npm is not supported; npm artifacts
  serve SDK library imports only.
  Native target support requires actual full-product evidence. The build-only
  Windows artifact and first-install adapter provide formation and availability,
  not native qualification, an existing system update, Runtime acceptance or a
  public registry release.
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

For the original active 0.1.2 operation only, retained attributable human
authorization permits the specifically scoped ordinary Source ingress and one
build-only artifact dispatch before successful package formation, to make the
requested build and first-installer available. The authorization and sequence
are recorded in `.agent/work/core-cloud-continuation-20261002/WORK.md` and its
current `RESUME-STATUS.md`; exact Source paths, workflow bytes, provider policy
and ownership remain subject to their actual reviewed controls. This exception
does not change the general successful-formation commit/push rule, authorize a
public registry release, weaken the existing seven-check qualification
contract, perform a system update or establish Runtime acceptance. After artifact
availability, qualify the exact asset and use the existing release-local owner
for the same-operation system update and postproof. If no supported
qualification path is available, keep that update open with an explicit GAP.
Start the separate Luna local-testing-script work only after a qualified update;
the GitLab target question remains pending and does not authorize runner setup.

For separately authorized CI Source ingress, before creating a request and again
immediately before dispatch, the repository controller must compare every
declared physical Source input with the selected published commit's regular-file
blob bytes, including Git-unchanged paths, and verify the approved workflow
definition. Recheck that Source stayed unchanged across the comparison. A changed
file list or Source binding alone does not prove committed-byte equality.
Missing, linked, converted or different inputs deny dispatch. Reconcile only
exact reviewed Source paths, honor existing Git attributes and preserve parsed
configuration, historical baselines and operation custody; refresh affected
byte-bound evidence. Do not change global Git settings, normalize the whole tree
or weaken integrity bindings. This guard grants no publication, activation,
native qualification or Runtime authority.

## Validation and safety

Agent checks are owned by `packages/agent/TESTING.md` and its package scripts.
Use the pinned Bun launcher for focused agent behavior and type/static/format
checks. Build/package/install validation belongs to CI/CD; no such local test
suite is authorized. The manual-only Windows x64 workflow now has a distinct
build-only `native-build -> emit-build -> upload` path. It publishes formation
files only and does not call or relax the separate seven-check current-v1
qualification contract. The workflow and producer require the approved
provider/profile and explicit repository-variable gate. Activation, a dispatched
run, build artifact availability, successful exact-asset qualification and
installed acceptance are distinct evidence; a failed Source-validation run
supplies no native proof.
GitHub retrieval is a replaceable repository adapter, not a runtime prerequisite.
Its approved workflow/repository/check policy and optional ZIP-reader capability
require separate qualification; no ambient credential or provider is selected.
The explicit downloader reserves a bounded exclusive transport, binds the
selected published commit and attempt job interval, and never forwards its API
credential to artifact storage. Missing/drifting locked ZIP capability remains a
GAP without installation. Latest package/tool policy belongs to the lifecycle
self-development owner. For 0.1.3, broad dependency/tool and caller adaptation
has last priority, after native UPDATE01/developer-unblocking work and required
installed checkpoints, before final 0.1.3 delivery and acceptance. Current exact
qualified pins remain usable for P0 work; a version-drift list alone does not
block it. An actual required runtime/reader defect and missing target evidence
still block their dependent effects. Preparation is not evidence that an old
Source pin is latest or that a native target passed.
The active 0.1.2 pre-formation exception above is the only current exception;
future CI Source ingress or pre-formation publication requires its own
attributable reviewable decision. Design acceptance alone does not change the Git
order above.
Numeric quality gaps remain explicit;
Static evidence never grants Runtime acceptance. Plugin commands are declared
by its owner after the product specification is present.

Preserve `.git`, history, origin and unrelated files. The predecessor runtime
is inactive provenance in `.tmp/archive`, never an active fallback. Do not
merge predecessor schemas or code into the current product. Existing consumer
v10 remains until the selected distribution, public CLI and fenced artifact
repair are verified. Existing tasks are retained as inactive provenance, not migrated.
