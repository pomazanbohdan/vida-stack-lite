# Official agent framework reference registry

Owner: agent maintainer. Class: supporting current research. Policy owner:
`../../instructions/development-lifecycle.md#self-development-protocol`.
Architecture owner: `../system-specification.md`. Work:
`vida-final-assurance-fix-20261001-sibling`; acceptance trace:
`AC-ARCHITECTURAL-DEFECT`, `AC-FINAL-ASSURANCE`, `AC-PARTIAL-FAILURE`.

Consult the official references relevant to each reported defect and record the
mechanic, applicability and chosen local invariant. The registry does not
require exhaustive per-defect research, introduce dependencies or services, or
grant local approval. Independent reference research retrieved the official
sources below on 2026-10-01, directly except for the noted Mastra snapshot search
result; unavailable or changed relevant sources require an explicit research
GAP. Vendor mechanics remain separate from approved local requirements.

| Family                              | Official references                                                                                                                                                                                                                                                          | Supported mechanics                                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI Agents SDK                   | [Orchestration](https://developers.openai.com/api/docs/guides/agents/orchestration), [running agents](https://developers.openai.com/api/docs/guides/agents/running-agents), [observability](https://developers.openai.com/api/docs/guides/agents/integrations-observability) | Manager ownership versus specialist handoff; run continuation; traces of calls, handoffs and guardrails.                                                                                                       |
| OpenAI Codex                        | [Built-in subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)                                                                                                                                                                                           | Bounded specialists, parent aggregation, status inspection and shared parent permission mode. Actual session tools require actual calls and observed results.                                                  |
| Claude Agent SDK                    | [Subagents](https://code.claude.com/docs/en/agent-sdk/subagents), [permissions](https://code.claude.com/docs/en/agent-sdk/permissions)                                                                                                                                       | Context-isolated bounded workers, final results and tool limits; explicit permission controls.                                                                                                                 |
| LangChain / LangGraph               | [LangChain agents](https://docs.langchain.com/oss/python/langchain/agents), [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [error and workflow design](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph)     | LangChain's agent tool loop uses LangGraph primitives; checkpoints and thread resume; separate transient retry, agent recovery, human pause and unexpected failure.                                            |
| Microsoft Agent Framework           | [Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)                                                                                                                                                                                                      | Explicit workflows for defined processes; documented successor of AutoGen and Semantic Kernel.                                                                                                                 |
| Google ADK                          | [Workflow agents](https://adk.dev/agents/workflow-agents/)                                                                                                                                                                                                                   | Deterministic sequential, parallel and loop workflows; the page distinguishes Python/Go ADK 2.0 graph and dynamic workflows.                                                                                   |
| Mastra                              | [Agentic workflows](https://mastra.ai/articles/agentic-workflows), [snapshots](https://mastra.ai/en/reference/workflows/snapshots)                                                                                                                                           | The opened workflow article supports persistence, parallel execution and suspend/resume. Official search retrieved the snapshots body; direct snapshot retrieval was unavailable in the final reference check. |
| Temporal, a durable workflow system | [Tasks](https://docs.temporal.io/tasks), [workflow definitions](https://docs.temporal.io/workflow-definition)                                                                                                                                                                | History replay, task versus business-execution failure, and separate external/non-deterministic activities.                                                                                                    |

## Packet-text screening applicability

The public development-task packet builder receives free text at a source
boundary. Explicit credential assignments and recognizable credential formats
remain denied across packet fields. Common words such as `state`, `session`,
`code`, `sig` and `signature` require protocol context so ordinary descriptive
prose and labels remain usable. These references support that local distinction;
they do not define local policy or add a runtime dependency.
Canonical behavior owner: [system specification](../system-specification.md#development-task-packet-text-screening).
Work trace: `.agent/work/vida-final-assurance-finish-20261001/WORK.md`.

| Topic                                    | Official reference                                                                                                                                                                                                               | Applicability                                                                                                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sensitive values and session identifiers | [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Credentials, tokens and session identifiers need protection. A blanket word list can misclassify ordinary text; evaluate the surrounding context.                                                                  |
| Classification and redaction             | [Microsoft logging source generation and redaction](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation)                                                                                          | The documented logging pipeline classifies sensitive data and selects redactors by classification, supporting explicit sensitive categories rather than treating every short label as a secret.                    |
| Payload-bearing diagnostics              | [OpenAI Node SDK client configuration](https://github.com/openai/openai-node/blob/main/docs/configuration.md)                                                                                                                    | SDK debug logs may include request and response bodies even when some authentication headers are redacted. Free-text packet fields therefore remain a relevant input boundary.                                     |
| OAuth values and bearer credentials      | [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html), [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html)                                                                                                                 | `state` and authorization `code` are meaningful in OAuth response context; bearer credentials remain recognizable credentials. The local screen preserves context-qualified checks while allowing ordinary labels. |
| OIDC nonce                               | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)                                                                                                                                                 | `nonce` is meaningful in the ID Token and replay-checking context; the local screen treats protocol-qualified values as sensitive.                                                                                 |
| SAML response                            | [OASIS SAML 2.0 technical overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)                                                                                                          | The `SAMLResponse` parameter carries the encoded SAML response in the HTTP POST binding; qualified response values remain sensitive.                                                                               |

## Current defect applicability

### Source configuration and explicit model selection

Owner: agent maintainer. Work: `npm-process-correction-20261002`. Behavior
owner: [Source development controller](../system-specification.md#source-development-controller).
The configured Source target has no active selector; a configuration repair
therefore binds its declared package inventory and selector absence. This
selection does not grant ownership or settle unknown effects. Consumer selector
binding and global maintenance/quiescence checks remain independent requirements.

[Mastra model selection](https://mastra.ai/reference/processors/model-selection-processor)
documents explicit model selection and overrides. It supports keeping the model
in the validated configuration rather than hardcoding a single migration target.
It does not authorize changing a model already bound to an issued local action.
[Bun SQLite](https://bun.com/docs/runtime/sqlite) documents read-only connections
and transactions; existing read-only inspection and fenced transactional state
checks remain in use. The official Mastra snapshots URL returned 404 during this
research, so it provides no additional evidence for this repair. These sources
inform mechanics, not local authorization or Runtime acceptance.

### Windows lock acquisition and disappearing sidecars

Owner: agent maintainer. Work: `npm-process-correction-20261002`. Behavior
owner: [scoped source and lease continuity](../system-specification.md#scoped-source-and-lease-continuity).
[fs-safe](https://fs-safe.io/) describes a root capability that verifies opened
file identity and preserves the filesystem boundary. Applicable mechanics are
the installed, attested `@openclaw/fs-safe` 0.5.6 `withFileLock`, sidecar snapshot
and pinned-root existence operations; current website APIs do not change that pin.
Local physical deletion during Bun 1.4.2 Windows `realpath` reproduced both a
`stat` failure on `$Extend\\$Deleted` and an opened-file identity mismatch.
The failed handle is never accepted. Only a separate absence check through the
same pinned root permits classification as acquisition contention, preserving
the original cause and existing caller bounds. Callback/release errors, ordinary
permission denials and present replacements retain their failures. Test evidence
and unresolved aggregate qualification belong to the work record, not this map.

### Explicit correction defaults repair

Owner: agent maintainer. Work: `correction-defaults-repair-20261002`. Behavior
owner: [system specification](../system-specification.md). The repair preserves
unknown provider outcomes while normalizing proven original attempt metadata;
it does not perform settlement or replay.

Verified official reference: [SQLite transactions](https://www.sqlite.org/lang_transaction.html),
retrieved 2026-10-02. `BEGIN IMMEDIATE` starts a write transaction immediately
and can fail with `SQLITE_BUSY` when another connection already holds a write
transaction. This supports the existing single transaction and dependency-CAS
boundary, including fail-closed contention. It does not define local repair
authorization. The accepted local invariant is atomic normalization of the
missing pair in Host and dependent receipts, preserving issue, unknown outcome
and authority. Existing Mastra persistence is retained; no new execution or
workflow replay is needed for this metadata operation.

Verified [SQLite isolation](https://www.sqlite.org/isolation.html) and transaction
references, retrieved 2026-10-02, support a consistent transactional scan and
serialized writes. They do not supply application-level CAS: the repair binds
all journal rows and compares their versions before changing only normalized
postimages. Unchanged journals with unknown read-only actions remain frozen
dependencies; no outcome is inferred. A changed journal retains its complete
issued-action validation. This behavior is covered by the interrupted Source
retirement regression and traced to `audit-36-absorption-release-20261001`.
The application-owned `agent_host_mastra_session_ledger` rows are separate from
Mastra workflow checkpoints; framework checkpoint isolation does not establish
the correctness of this repair or authorize replay.

Research GAP: official JSON Schema 2020-12 core and validation pages returned
HTTP 403 during the bounded lookup. The repository's strict current-v1 schema
and executable checks remain the available local evidence. Source fixture
results and controller qualification are distinct from actual Windows repair,
installed behavior and Runtime acceptance.

### Final assurance and settlement

The generic final-assurance defect uses Mastra's persisted suspend/resume join
and OpenAI's manager-owned orchestration as design evidence for explicit
application-owned review and reverse actions. The local HostState remains the
sole lifecycle/CAS owner. Three fresh distinct review actors and their matching
reverse observations bind one current seal and CLEAR; framework run success is
not delivery or Runtime acceptance.

For a report timeout, LangGraph and Temporal provide recovery comparisons, not
proof of an action's outcome. The inspected local journal retained revision 8,
both issued actions pending, and no accepted report. The later
inspection had overwritten the earlier single-file process log. Neither that
timeout nor absence of a process proves no invocation, no side effect or
transaction atomicity. Preserve issued identities and accepted partial reports;
obtain attributable terminal observation or supported reconciliation before
repeating effects. Retrying the identical captured report through the existing
public report operation is observation delivery, not validator re-execution:
the persisted exact duplicate returns current state before stale-CAS rejection,
while an uncommitted report still requires the open issue and current CAS.
Per-invocation diagnostics must preserve bounded sanitized
status, signal, output, error and phase timing without changing evidence
authority.

Accepted technical decision: a semantic validator FAIL requires a new
Host-authorized corrective assignment, rather than a transport retry or replay
of the completed writer. The configured assignment index remains a parallel
slot; correction generation is explicit authority, separate from ownership
lease generation. Preserve completed attempts and failed observations. Require
actual negative findings, attributable correction authorization, current scope
and acceptance, a live exact-path lease, and terminal outcomes for every issued
action. Framework resume mechanics cannot grant this authority. The strict current assignment contract binds this generation; active older
artifacts require the bundle-owned atomic artifact repair and recovery route
before reader adoption. Runtime readers use only the repaired strict current-v1 contract.

Relevant settlement references: [OpenAI Sessions](https://openai.github.io/openai-agents-python/sessions/)
separates retained conversation state from new execution; [Anthropic tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
describes explicit tool request/result boundaries; [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
and [Microsoft checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)
support resumable persisted execution; [Temporal activities](https://docs.temporal.io/activities)
separates activity attempts and durable workflow outcome. These are mechanics
analogies, not authority to settle local effects or grant permissions. The local
Host owns exact settlement, resource release and history. The chosen .2 repair
reuses existing operations; a public batch-settlement command is a subsequent
optimization, outside this release.

Child/disjoint contours retain the original human request thread and pointer.
Generated intake or WORK filenames are operational identities; changing them
does not establish a changed human request. The admitted local source scope,
approval, ownership and CAS controls remain mandatory.

## Source reaudit applicability (2026-10-02)

The user supplied `vida-agent-reaudit-26e960c.md`; it is historical Code/Static
and incident evidence, not qualification of current Source. Independent bounded
research confirmed the missing default native packaging input, issue-before-local
activation recovery gap, incomplete action/packet projections and test fixture
and inventory drift. The SQLite incident artifacts are absent: causal attribution
remains a GAP. The existing LangGraph/Temporal/Mastra references support separating
checkpoint retry from external-effect replay; they do not prove the local journal
or filesystem invariant. The implementation retains local identity, CAS and
possible-exposure boundaries.

Official npm v11 [script lifecycle](https://docs.npmjs.com/cli/v11/using-npm/scripts/)
and [package files](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#files)
were retrieved by the distribution researcher: `prepack` participates in normal
pack, and the files allowlist defines advertised package contents. Chosen local
contract: verified SDK packaging is separate from unimplemented native delivery.
Official [Node errors](https://nodejs.org/api/errors.html) and
[Bun test runner](https://bun.sh/docs/test) were retrieved in the cloud session.
The chosen local initialization invariant retries acquisition contention only,
never a protected operation after entry. Required nested Bun regressions must be
explicitly wired into the ordinary aggregate; mutation inventory completeness is
separate from actual manual mutation results.

Existing OpenAI observability and Mastra persistence references describe tracing
and stored observations, not trusted subprocess provenance. V10 therefore keeps
cooperative tester report consistency explicit and does not invent executed-suite
proof, native host enforcement or Runtime acceptance.

## Deepest project-root membership (2026-10-02)

Owner: agent maintainer. Work: `core-directory-policy-20261002`. Behavior owner:
[scoped source and lease continuity](../system-specification.md#scoped-source-and-lease-continuity).
The verified official [Claude Agent SDK permissions reference](https://code.claude.com/docs/en/agent-sdk/permissions)
describes deny-precedence mechanics. The official [fs-safe root boundary](https://fs-safe.io/root.html)
and [path scope reference](https://fs-safe.io/path-scope.html) describe rooted
filesystem access and path-scoped operations. These references were fetched
successfully on 2026-10-02. They support applying explicit membership denial
before scoped source access while retaining existing rooted no-follow checks;
they do not define this project's directory ownership model.

The accepted local invariant is deepest-root membership: equal deepest roots
share membership, a nested project excludes a broader parent below that root,
and a path outside all product roots is eligible only through an exact scoped
work item and selected `ProjectContext`. Repository-path evidence remains
read-only; membership does not change `code_selectors` or current-v1 schemas.

## Historical recovery and delivered configuration

Owner: Agent/Core. Behavior owner:
[recovery across delivered configuration](../system-specification.md#recovery-across-delivered-configuration).
Work: `core-cloud-continuation-20261002`.

Verified official [Bun SQLite](https://bun.com/docs/runtime/sqlite) documentation
defines readonly connections and synchronous immediate transactions. The
chosen Host invariant checks the frozen global state on the acquisition's own
connection before its fence write. This supports one-store transaction mechanics,
not atomicity across Host, Mastra and filesystem receipts.
[Mastra snapshots](https://mastra.ai/docs/workflows/snapshots) documents retained
workflow input, run/status and suspend/resume context. The local recovery reader
checks the actual original snapshot and configured requests; missing Host journal
does not prove missing engine state.
[Temporal Worker Versioning](https://docs.temporal.io/worker-versioning) describes
pinned workflow execution and explicit version transitions. It is a comparison
supporting immutable historical execution bindings, not a VIDA dependency or
permission to migrate local work implicitly.

The accepted local design keeps desired configuration, locally accepted
configuration and historical work authority distinct. Recovery control remains
reachable without authorizing new execution. Fresh local admission retains the
complete canonical original scoped metadata in an attempt-specific Work artifact,
rechecks it inside Host admission and verifies the immutable base run on retries.
Existing filesystem exclusive creation supplies publication; Host SQLite supplies
transactional Work/coordination commit. Their combined sequence is recoverable,
without cross-store atomicity or Windows directory-durability guarantees.
Interrupted unreferenced preparation grants no writer rights; historical Work
without retained entries is not reconstructed from current bytes.
Original historical scope proof,
qualified artifact repair followed by durable source-delivery adoption, and
same-attempt corrective rebinding are required to prevent the recovery/admission
cycle. The bounded historical disposal implementation cannot close those GAPs.
CLI equality and synthetic fixtures do not authenticate a native caller or
provide attributable Runtime acceptance.

Official [OpenAI Agents SDK human-in-the-loop guidance](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)
describes resumable run state and approval decisions within that run. Checked on
2026-10-03, this supports the local invariant that a decision or retained snapshot
cannot silently move to a different execution attempt. It does not authenticate
VIDA's local CLI caller or integrate the SDK into HostState. Mastra's snapshot
identity similarly supplies actual engine run evidence, not source preimage
bytes, filesystem rollback or permission to dispose of UNKNOWN work.

## Pinned verification budget and process outcome

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
Verification owner: [TESTING.md](../../TESTING.md); execution policy owner:
[self-development protocol](../../instructions/development-lifecycle.md#self-development-protocol).

Official [Bun test timeouts](https://bun.com/docs/test/writing-tests) define the
default five-second case limit and timeout failure. Official
[Node child-process documentation](https://nodejs.org/api/child_process.html)
defines synchronous spawn timeout and signal behavior; a requested signal is
not a descendant-termination observation. Microsoft's
[taskkill reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill)
defines `/T` process-tree targeting and `/F` forced termination. References were
checked on 2026-10-03; actual pinned Bun/Windows outcomes require local evidence.

The local invariant retains explicit case/operation limits and any selected
caller/host deadline; ordinary phases impose no total-duration limit. Where a
finite parent deadline is present, sequential children consume its remaining
budget, including shell-forwarded stages;
duration plus same-host expiry is rebased onto each process's monotonic clock.
The explicitly selected or inherited launcher deadline remains authoritative and expired/malformed input
denies another child. Cleanup command outcomes are recorded separately from
execution timeout and observed termination; uncertain state prevents fixture
reuse. Package reuse preserves immutable bytes and isolated mutable contexts,
while the exact extracted archive still supplies its own install and repair
proof. Measured stage costs inform further changes; neither wider timeouts nor
partial test output establishes a performance gain or Runtime acceptance.

The shared terminal guard distinguishes observed completed exit1 from timeout,
signal, spawn error or missing terminal status. An uncertain command cannot
supply parseable protocol evidence; its primary process failure remains visible.
Initializer cases share one explicit bounded case budget, retaining all existing
public inputs and assertions. A completed outer smoke failure can contain an
uncertain child; parent archive/result staging is conservatively retained along
with that child's own fixture. The Node and Microsoft process references above
support these observation boundaries, without proving actual descendant death.

Official [Bun benchmarking and CPU profiling](https://bun.com/docs/project/benchmarking)
supports monotonic timing and `--cpu-prof-md` diagnostics. Checked on 2026-10-03,
profiling and observer overhead make these conditions unsuitable for claiming
comparable speed gains. The existing reserve is divided between cleanup and
reporting; a spent cleanup allowance remains unknown rather than consuming the
report tail. A known CAS exit1 remains distinct from a watchdog's null outcome.

The bounded isolated initializer measurement in
`core-cloud-continuation-20261002` used fresh copies of the actual pinned bundle,
lock and dependency junction. Fixture preparation took349.627/359.380ms. Both
five-second diagnostic conditions timed out and retained their roots; no final
initializer qualification or speed gain is established. Partial observer output
locates repeated guarded publication calls at255.287–332.336ms, with native creator
preparation168.625ms. These are nested samples under instrumented conditions,
not a complete disjoint duration partition or proof of a particular native
provider, hashing or filesystem cause. Production startup, extracted installation
and recovery-route cost remain open measurement/qualification GAPs. A performance
change requires a newly frozen scope and independently checked behavioral
equivalence; observation alone does not authorize weakening provider attestation.

## Native creator effect boundary

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
The official [fs-safe Root API](https://fs-safe.io/root.html),
[security model](https://fs-safe.io/security-model.html) and
[native-helper policy](https://github.com/openclaw/fs-safe/blob/main/docs/native-helper.md)
were checked on 2026-10-03. They describe root identity, exclusive operations and
platform-dependent containment. The actual pinned0.5.6 library already denies
cached-await root replacement for both write and mkdir: original-code isolated
controls produced no target in either root. This is preserved behavior, not a
reproduced escaped-write vulnerability. The current website's
assertBeforeMutation callback is absent from that installed version's JS/types;
the implementation introduces neither that unsupported callback nor an upgrade.

Each asynchronous creator caller owns its final package/root check after await
and directly before native dispatch, plus its postcompletion check. First Root
construction is also checked. Removing redundant cached-handle preparation
does not cache attestation or weaken the native/path/identity controls. A
separate completed readonly native-creator CPU profile recorded163.240ms
preparation and nested379.8ms tree-hash samples including import; sampled totals
are not added to wall time. The uninstrumented max identity control failed at
4749ms child allowance before this correction; the current control completes
the real public initializer in3907.018ms, case3920.10ms,1PASS/0FAIL. Its fresh
root/pinned layout is preserved, but the failed baseline is censored and ambient
load/cache variance is uncontrolled. This demonstrates one restored control,
not a precise speedup percentage, full qualification or native acceptance.

The shared Root promise also serves asynchronous replacement and locking. Their
wrappers preserve both original package/root checks around the await before
helper dispatch; their downstream cached binding is not fresh attestation.
Caller enumeration is therefore part of the optimization's security boundary.
Actual regressions denied attestation during the cached await: the uncorrected
wrappers completed both operations, while corrected wrappers reject before
payload, sidecar or callback effects. Root replacement controls remain denied.
Only creator operations use the three-to-two check reduction.

## Descriptor simulation host boundary

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
Official [Windows FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)
requires a handle with write access. The [Linux fsync contract](https://man7.org/linux/man-pages/man2/fsync.2.html)
permits flushing a valid file descriptor and distinguishes file flushing from
directory-entry persistence. [Bun's x documentation](https://bun.com/docs/pm/bunx)
places the forced Bun host option before the executable. Checked2026-10-03.

The Linux descriptor simulator's real Windows host rejected readonly clone
flushing with EPERM, independently reproduced against the exact Source
beforeimage. Its adapter preserves the production descriptor contract by
opening only owned physical private fixture files without creation/truncation,
requiring identical device/inode and actual flushing of the temporary writable
handle. Real flush failures propagate and the handle always closes. Captured
known-child failure diagnostics remain distinct from status/count assertions.
Actual isolated12controls and the wrapper pass, including readonly unchanged
content and substituted-path denial. No Linux native or directory durability
qualification follows from Windows simulation.
Directory classification uses the opened descriptor. A substituted directory at
a regular file's pathname is denied before reopening, preserving the same
descriptor identity boundary as file substitution.

## Same-version update and engine production boundaries

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
Checked2026-10-03: the official [SQLite transaction contract](https://www.sqlite.org/lang_transaction.html)
defines immediate writer acquisition and one simultaneous writer. It supports
the shared release allocator exclusion, not atomicity of separate file saves.
[Mastra suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume)
persists suspension snapshots and restores exact captured steps across restarts;
it does not atomically commit this product's separate Host journal.

The normal allocator selects the next patch.
The explicit system-update route retains current version/manifest bytes and
validates successful and pending identities before ordinary allocator effects.
Only existing exact completed archive/installed reconciliation can repair a
missing success stamp. Pending UNKNOWN returns its actual journal and remains
unreplayed; archive/tree verification distinguishes changed same-version payloads.
These controls use isolated fixtures, not the actual system installation.

Current producer calls require the actual configured ledger and Host exclusion
before LibSQL initialization and each start/resume. The CLI opens after intake
and scope validation; staged witnesses inspect existing persistence without
producing it. The protected existing governance reservation retains UNKNOWN
across engine/journal crash windows. Actual private-process controls cover
termination before init/start/resume, before journal sync and after journal sync;
restart, competing production and maintenance cannot clear or replay UNKNOWN.
Matching persisted engine/journal evidence permits normal private-handle
settlement. These controls establish local persistence evidence, not atomicity
between the two databases, installed qualification or user Runtime acceptance.
The completed Codex assessment finds no usable authenticated recovery issuer in
its inspected public surfaces; local handles and test capabilities do not supply
native caller proof. Authenticated UNKNOWN recovery remains an integration GAP, separate
from the system-update allocator and current human-authorized Source work.

## Shared deterministic processing and qualification callers

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
Checked2026-10-03: [RFC8785](https://www.rfc-editor.org/rfc/rfc8785)
defines deterministic JSON serialization for stable data hashing. The existing
canonicalize serializer remains the wire owner; this product's stricter finite
payload and descriptor guards remain independently required.
[ECMAScript SerializeJSONProperty](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty)
reads `toJSON` through the prototype chain and calls a callable result. Therefore
deep freezing a loader-owned configuration is insufficient for unrestricted
digest caching: its ordinary arrays retain mutable inherited hook exposure.
Current loaded records have null prototypes; every cached digest read uses the
existing canonical validator's live array/prototype hook guard. Non-loader objects
are never memoized. Fresh YAML bytes still select a fresh loaded object.

[Mastra LibSQL integration](https://mastra.ai/integrations/databases/libsql) and
its [official storage implementation](https://github.com/mastra-ai/mastra/blob/main/stores/libsql/src/storage/index.ts)
describe the storage lifecycle. Actual installed `@mastra/libsql`1.23.3 constructs
its domain stores and performs local initialization. Journal-only CLI retrieval
uses the existing actual readonly snapshot reader instead of opening storage;
real start/resume retain initialization and Host producer exclusion. No init
disable flag or dependency upgrade replaces those guards. Existing immutable
copied-package cache namespaces are selected before each fresh recovery process;
this removes redundant delegation without substituting an in-process CLI.

[Bun profiling](https://bun.sh/docs/project/benchmarking) supports CPU diagnostic
profiles. The local current fixture's profile identified repeated canonical
processing and filesystem probes; sampled overlap is not summed into wall time.
These diagnostics supply a shared-cause hypothesis, not measured savings, a
benchmark score or qualification. A real contained controller setup uses supported
prepare/verify and its frozen-lock production copy boundary. Fresh consumers run
its actual copied public CLI independently of its exact-target exec contract.
Per-case package binding checks and unknown-effect retention remain mandatory.

## Testing bottlenecks and task-end qualification

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
Checked2026-10-03 against primary documentation:

- [Bun test discovery](https://bun.com/docs/test/discovery) supports exact file
  selection and test-name filters. [Vitest filtering](https://vitest.dev/guide/filtering)
  explains that name filters still load each selected file to discover tests;
  combine file selection with a name filter to avoid unrelated module/setup cost.
- [Vitest related](https://vitest.dev/guide/cli#vitest-related) selects dependencies
  expressed with static import paths, but cannot discover a computed import path.
  Configuration, filesystem and separately launched CLI dependencies therefore
  need explicit affected-test selection in this product.
- [Vitest performance diagnostics](https://vitest.dev/guide/profiling-test-performance)
  separates transform, import, setup, environment and test time. Existing local
  diagnostics are sufficient to identify a costly phase; they do not require a
  fresh full benchmark cycle. Parallel phase totals are not aggregate wall time.
- [Pytest fixture scopes](https://docs.pytest.org/en/stable/how-to/fixtures.html#scope-sharing-fixtures-across-classes-modules-packages-or-session)
  reuse expensive setup within a chosen scope. This is a transferable pattern,
  not an added Python dependency: reuse this product's immutable prepared package
  while keeping per-case mutable state and required live binding checks fresh.
- [Node spawnSync](https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options)
  has an optional timeout. An unlimited product command omits that native option;
  it does not pass Infinity or serialize it into inherited deadline metadata.
- [Bun afterAll](https://bun.com/reference/bun/test/afterAll) accepts HookOptions
  for async fixture teardown. [Bun timeouts](https://bun.com/docs/test/writing-tests#timeouts)
  use a five-second default and throw an uncatchable timeout. The contained
  package fixture maps its existing cleanup/report reserve to that one hook,
  with a static allocation and live pre-delete reserve checks. Fresh binding
  verification and asynchronous deletion remain; exact-root pending/completion
  diagnostics preserve custody when a hook timeout cannot be caught. This is
  lifecycle allocation, not a faster operation or a general timeout increase.

Current human decision: selected partial checks during development, full current
task testing after the corrections are complete; cancel the implicit300-second
launcher and ordinary phase limit. The maintained lifecycle instruction owns
sequencing, TESTING owns check selection, and explicit case/probe/install and
inherited host deadlines remain observable. No removed deadline is a speedup or
a passing result. Static/code evidence cannot close installed Runtime acceptance.

Current local command outcomes and retained-root dispositions are recorded in
`.agent/work/core-cloud-continuation-20261002/PRODUCER-JOINS-GATE.md` at the Source
repository. Setup/install/snapshot stage diagnostics explain cost; they do not
establish measured savings. Failed observations stay failed, and uncertain
private roots are never replayed or cleaned from PID absence.

Read-only Luna/max phase audit found candidate suite writes in private copies or
coverage/cache outputs, without a required Source dist rebuild between phases.
Current candidate scripts reuse one Source build, retain every required phase,
and run the exact separately withheld archive case with its actual private-copy
build/install. Standalone commands keep their build guards; coverage start/stamps
and current-source bindings remain. Focused script-graph controls verify that
sequencing and alias-body equivalence. This is code/static evidence; aggregate
wall-time improvement and complete candidate qualification remain unproved.
Do not add a build-counter benchmark during development; final qualification
must still observe every required phase against current inputs.

## Host-independent recovery-review ingress

Owner: Agent/Core. Work: `core-cloud-continuation-20261002`.
Decision: the human-given isolated agent environment supplies the trusted internal
caller boundary. External issuer, OS, Desktop and provider attestation are not
prerequisites for internal recovery. All reusable VIDA behavior remains portable.
Normative behavior is owned by the
[system specification](../system-specification.md#host-independent-recovery-review-ingress);
execution policy is owned by the
[self-development protocol](../../instructions/development-lifecycle.md#self-development-protocol).
Decision attribution and independent gates are retained in the Source work's
`RECOVERY-CONTROL-INGRESS-PLAN.md`.

Current local mechanics: the ordinary session reserve/complete pattern in
`src/runtime-kernel.ts` records caller-observed consistency; admitted-session
execution deliberately does not invoke native tools outside the active caller.
The recovery route reuses `bin/runtime-config-rebind.mjs` historical inspection
and a separate pinned `bin/run.mjs` call-through before ordinary admission.
HostState protects a recovery namespace with existing `OperationReservation/v1`,
CAS and producer/maintenance fences. Request/result bodies remain in same-thread
caller history; stored digests bind them. Possible dispatch precedes the native
call; UNKNOWN never permits reissue. No new runtime, dispatcher, schema or table
is introduced. Test observations are injected fixtures, not native receipts.

Relevant researched patterns use intent persistence before invocation, correlated
terminal results, conservative replay and portable execution boundaries. Pi is a
pattern reference only; existing VIDA libraries own implementation. No Pi package
or second runtime is installed.

External interface facts remain separately scoped:

- [Codex App Server](https://learn.chatgpt.com/docs/app-server) documents stdio,
  session/thread identity and turn completion. They correlate execution, not VIDA
  historical-owner authority. Dynamic tools are experimental; the retained
  stable0.160.0 schema lacks dynamicTools on ThreadStartParams.
- [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
  distinguishes HTTP authorization from stdio credential handling and requires
  audience validation. Transport authorization is not VIDA operator delegation.

Source code and fixtures do not close actual native observation, installed
qualification, release assurance or Runtime acceptance. The isolated internal
premise is Decision evidence; no external proof-export GAP blocks this route.
Current strict-v1 compatibility shapes remain unchanged; future artifact changes
still require shipped functional bundle-owned repair.

## Public export inventory and focused verification

Checked2026-10-03. [TypeScript modules](https://www.typescriptlang.org/docs/handbook/2/modules.html)
describe explicit module exports. The current `src/index.ts` exports project
membership, selected-project resolution and repository-scope eligibility; the
explicit ZOMBIES inventory includes them and references their observable boundary
cases in `tests/project-context-boundary.test.mjs`. The expected inventory stays
independent of runtime enumeration so an unexpected public export still fails.

[Vitest filtering](https://vitest.dev/guide/filtering) distinguishes file selection
from name filtering: a name filter alone still loads test files. Use the exact
affected file with a case filter during correction, then its full owner and the
referenced boundary tests. Reuse unchanged completed qualification evidence and
continue unexecuted stages; these research facts grant no release or Runtime
acceptance. Existing Vitest and TypeScript libraries satisfy this pattern.

## Portable smoke aggregate deadlines

Checked2026-10-04. [Bun runtime behavior](https://bun.sh/docs/test/runtime-behavior)
documents that a test timeout of zero or Infinity disables its watchdog. Use zero
for the packaging test that wraps the complete extracted smoke flow and the five
serial restart/resume lifecycle wrappers identified in TESTING; other shipped
test cases retain their bounds. Existing VIDA execution
budgets use Infinity for aggregate work, omit an unbounded native timeout, and
preserve explicit inherited caller deadlines with cleanup/report reserves.

[Node child processes](https://nodejs.org/download/release/v24.19.0/docs/api/child_process.html)
documents synchronous child waiting and timeout termination. A timed-out child
does not establish descendant cleanup. Preserve failed receipts and uncertain
private roots, and reconcile issued effects before another qualification. These
patterns use current Bun and VIDA helpers; no dependency or host trust mechanism
is added. Removing an aggregate deadline establishes neither speed improvement
nor passing qualification. Check selection remains owned by TESTING and lifecycle.

The extracted four-file suite completed beyond the former aggregate limit with
80 passing cases and five restart/resume failures at Bun's implicit five-second
watchdog. Subsequent fixture cleanup raced still-running callback writes. These
five wrappers await every plan/apply/resume call; the rebind implementation awaits
its lock callback and writes and closes its database in `finally`. Disabling that
wrapper watchdog lets teardown follow actual callback settlement. Preserve
existing lock settings, including an existing zero timeout, and explicit
CLI/caller limits; the direct rebind API exposes no deadline option. This is
fixture sequencing evidence, not a production deadline or Runtime acceptance.

## Persisted workflow sequence inspection

Checked 2026-10-04. The Mastra maintainers' [workflow state reader issue](https://github.com/mastra-ai/mastra/issues/16044) describes persisted recovery fields and per-step output/payload data. The snapshot documentation was discoverable by search, but its old direct URL could not be opened; that access remains a research GAP. The actual pinned local Mastra fixture records a successful wave's payload, resume observations and output, followed by a suspended wave whose payload is that output. These fields support read-only verification of the configured execution prefix. A single suspended frontier or terminal result alone does not prove earlier execution. This evidence supports the existing SQLite inspector; it does not authorize a framework upgrade or storage initialization during inspection.

## Standalone build and installation primitives

Checked 2026-10-04. Official [Bun executable documentation](https://bun.sh/docs/bundler/executables) describes compiled executables, embedded files, WASM and direct N-API addon inclusion. Setting BUN_BE_BUN=1 makes the same executable its Bun child runtime, so a second Bun executable is unnecessary. Compile options can disable ambient dotenv and bunfig loading. Verify these capabilities with pinned Bun 1.4.2; current online documentation alone proves no VIDA target readiness.

[Bun Archive](https://bun.sh/docs/runtime/archive) provides archive creation and regular-file enumeration. Extraction can include links and overwrite files; use exact owned immutable payload checks and reject unsafe, conflicting or tampered materialization. Cedar loads its WASM from a package-relative path and LibSQL uses computed platform addon resolution, so a successful thin compiled probe cannot qualify their full resource closure.

[Bun install](https://bun.sh/docs/pm/cli/install) documents warm-cache preference and platform backends. Preserve frozen dependencies and physical immutable controller custody; a hardlinked cache is not that custody. [npm config](https://docs.npmjs.com/cli/v11/using-npm/config/) defines prefer-offline as bypassing cache staleness requests while fetching missing data. This is a Source/library tooling fact, not an authorized public agent installation. [Node filesystem APIs](https://nodejs.org/docs/latest-v24.x/api/fs.html) offer standard file copies and renames; apply them only where ownership, exact bytes and failure recovery remain intact. No native timing or size improvement is established by these references.

## Pinned native construction boundaries

Checked 2026-10-04 against pinned Bun 1.4.2. The maintained builder uses Bun's
[compiled executable API](https://bun.sh/docs/bundler/executables), embedded
archive files and bytecode with retained diagnostic names. The same executable
serves as its Bun child runtime. The [frozen production install](https://bun.sh/docs/pm/cli/install)
uses the existing dependencies, `copyfile` backend and hoisted linker; no hand-written
transitive resolver or additional runtime is introduced. Full native loader and
resource behavior still requires actual product checks.

A retained minimal probe with empty PATH and an invalid BUN_OPTIONS preload exits
before application JavaScript. Bun documents standalone startup BUN_OPTIONS;
compile autoload flags do not suppress this startup input. The entry can sanitize
child environments only after it starts. This is a local trusted-caller/runtime
boundary, not host-specific authentication or evidence of installed readiness.

Pinned construction check: `--backend=copy` exited successfully but produced cache-hardlinked files. The documented flag is `--backend=copyfile`. The builder uses that exact flag and still rejects every non-regular or multiply linked dependency; it does not weaken resource custody to accept the failed staging tree. Failed private staging is retained.

Pinned Bun 1.4.2 construction observations: static `file://` bootstrap imports
failed resolution, while an absolute physical file import compiled successfully.
Direct `Bun.write` of a gzip-configured Archive wrote an uncompressed tar; the
explicit `Archive.bytes()` API returned gzip bytes. The builder verifies that
envelope before exclusive publication. These observations refine the official
[Bun bundler](https://bun.sh/docs/bundler) and [Archive](https://bun.sh/docs/runtime/archive)
mechanics; a compiled private pilot is not native release qualification.

A retained full-payload cold pilot reached its 30-second CLI bound during private
resource materialization and left 5,190 payload files plus its uncertain lock.
Its roots remain retained, and this outcome is not replay or cleanup authority.
The cache is reconstructable data; eliminate per-file persistence flushes while
retaining the flushed publication lock, atomic namespace, exact byte checks and
partial/UNKNOWN refusal. This does not change transactional runtime durability.

Demand-driven native discovery uses only the resources needed by existing public
commands; full runtime routes retain the complete physical dependency closure.
The installer-protected input contract is re-exported by install.mjs and declared
in the pure cli-metadata.mjs module. Every
selected view retains exact regular inventory, bytes and publication checks.
[Node filesystem documentation](https://nodejs.org/api/fs.html#fslstatsyncpath-options)
defines lstat with throwIfNoEntry=false; using that one current observation removes
the preceding existence probe without caching filesystem authority. No aggregate
savings or full native qualification is inferred from this correction.

The existing [Bun Archive API](https://bun.sh/docs/runtime/archive#filtering-with-glob-patterns) supports positive pattern arrays for files(). Native discovery uses that API to return only its owned view rather than materializing all dependency blobs in memory. Exact selected inventory and byte checks still apply.

The [Bun Runtime documentation](https://bun.sh/docs/runtime) and [bunfig configuration](https://bun.sh/docs/runtime/bunfig) document explicit --config loading. The existing runPinnedBun call supplies the maintained bundle bunfig.toml; the discovery view retains those exact bytes so the child keeps its configured environment and telemetry policy.

### Native bootstrap import boundary

Bun executable compilation bundles imported modules; its runtime has virtual
embedded paths. The bootstrap imports only pure CLI metadata and resource code.
The installer protected-input list is shared through the pure metadata module;
physical installer/launcher modules execute only after resource materialization.
The compiled version regression verifies that no imported installer entrypoint
executes before bootstrap. This is a narrow construction check, not full target
qualification. Official references: https://bun.sh/docs/bundler/executables and
https://bun.sh/docs/runtime/module-resolution . Existing standalone entrypoint
observation is the pin-specific evidence; no dependency upgrade is required.

### Source-only recovery fixture boundary

The official Node fs.cpSync filter returns false to omit a source directory and
its descendants: https://nodejs.org/api/fs.html#fscpsyncsrc-dest-options . Source
repair/recovery fixtures omit only generated dist/standalone. Agent JS/TS,
schemas, instructions and current SDK output remain in the fixture. A binary
release asset is not a text-source snapshot input; do not increase the guarded
8MiB text-read limit to accommodate it. Build/install validation belongs to
CI/CD, while actual agent recovery and UNKNOWN handling stay local. This is
fixture scope evidence, not installed delivery or Runtime acceptance.

### Unprepared execution recovery

The existing Mastra persistence owner uses durable snapshots to restore an exact
run and its suspended state: https://mastra.ai/docs/workflows/snapshots . A missing
Host journal cannot prove engine absence. VIDA's finite preparation-release route
therefore reads the existing engine and every applicable identity while the
existing Host producer fence excludes new reservations. Missing engine storage,
surviving snapshots, unknown producer markers and incomplete corrective history
remain denial evidence; no snapshot or journal is synthesized.

SQLite's immediate transaction excludes competing write transactions and may
return SQLITE_BUSY: https://www.sqlite.org/lang_transaction.html . VIDA uses this
existing Host transaction for producer exclusion, exact Work/Ledger CAS and its
strict v1 release/retry row. The separate Mastra database is inspected read-only;
the implementation does not claim atomic commit across the two databases. Exact
retry checks the original same-work postcondition, while unrelated coordination
progress is retained. This is Source architecture/mechanics evidence, not live
disposition authority, installed qualification or Runtime acceptance.

The isolated local controller establishes actual human authority before invoking
the cooperative CLI; argument validation does not authenticate that directive or
introduce another issuer. SQLite documents BLOB length in bytes and aggregate sum:
https://www.sqlite.org/lang_corefunc.html and https://www.sqlite.org/lang_aggfunc.html .
The engine census computes aggregate byte size before reading payloads into JS,
then retains per-row validation. The bounded256-row/8MiB census can deny healthy
unrelated history; that availability ceiling remains a GAP until a paged owner
census is needed. Any corrective-history row denies this unstarted-only route
without loading or interpreting its payload.

### Same-operation release retarget mechanics

Official fs-safe archive and binary store references are
https://fs-safe.io/archive.html and https://fs-safe.io/file-store.html . The
installed pin0.5.6 types/source own API applicability: guarded Root.copyIn,
create/readBytes/move and extractArchive support private staging, rejected links,
entry filtering and size/count/depth limits. Root.copyIn overwrites its destination;
VIDA therefore reserves each candidate/custody namespace exclusively before copying.
An incomplete or conflicting namespace is UNKNOWN, not permission to overwrite.
Newer web API options are not assumed available in the installed pin. Archive
timeout0 disables that library timer; structural limits remain. No compiler,
runtime/dependency installation or host npm tar resolution is added.

SQLite immediate exclusion uses the same existing admission and operation files:
https://www.sqlite.org/lang_transaction.html . Expensive byte/extraction/copy work
precedes short publication under admission-then-operation locks. A planning
reservation blocks normal worker reuse before custody copying starts; incomplete
copies remain UNKNOWN and are never reconstructed. A clean reservation before
first custody creation can continue only the exact frozen plan and preimages;
exclusive first-directory creation still occurs under the same locks. Source bytes and
physical observations share one scan; under-lock identity rechecks preserve the
cooperative boundary without another byte scan. Atomic file replacement does not
make the archive, release journal and phase receipt one atomic transaction;
exact known pre/post images supply forward recovery and lost-ACK continuity.

https://bun.sh/docs/runtime/archive documents creation from inert in-memory
members and gzip bytes, used only for local state/fault fixtures. Such synthetic
archives prove custody/retry mechanics, not compiled native behavior or delivery.
The fixed packaged repair preserves original pointers/version and every release
field except candidate metadata/source/archive bindings. Stage, review and
Source proof remain separate from current trusted CI/CD, installed and human
Runtime acceptance; no actual current CI/CD receipt is present.

### Portable CI delivery observations

Checked 2026-10-04. Official GitHub [workflow-run API](https://docs.github.com/en/rest/actions/workflow-runs)
supports exact run-attempt retrieval; [job API](https://docs.github.com/en/rest/actions/workflow-jobs)
exposes actual required step observations. The [artifact API](https://docs.github.com/en/rest/actions/artifacts)
provides repository/run ownership, expiry and transport digest. These corroborate
an explicitly approved repository workflow, not local JSON or human authority.
The artifact ID is available after upload, so it belongs to retrieved controller
provenance rather than the producer's pre-upload result. Separate provider ZIP
bytes from nested VIDA archive, manifest and executable bytes.

Actual repository origin uses GitHub; no workflow/profile is activated, remote
permissions/visibility were not queried and no run was issued. The portable
Source consistency consumer accepts actual attributable isolated controller
observations without a provider/host/Desktop attestation prerequisite. Optional
GitHub retrieval uses exact attempt/job/artifact records under a separately
approved policy, without history-wide scans or ambient credentials.

Pinned fs-safe0.5.6 exposes guarded readArchiveEntry for ZIP members but its
optional jszip dependency is absent here. No dependency was installed and no
custom ZIP verifier was created. That adapter remains unqualified until an
actual existing qualified boundary is available. Source ingress/publication,
activated native checks, real CI receipts and installed proof remain GAPs.
Synthetic local state tests establish request/retry/current-byte controls only.
