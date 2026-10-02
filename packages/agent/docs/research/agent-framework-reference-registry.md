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

| Family | Official references | Supported mechanics |
| --- | --- | --- |
| OpenAI Agents SDK | [Orchestration](https://developers.openai.com/api/docs/guides/agents/orchestration), [running agents](https://developers.openai.com/api/docs/guides/agents/running-agents), [observability](https://developers.openai.com/api/docs/guides/agents/integrations-observability) | Manager ownership versus specialist handoff; run continuation; traces of calls, handoffs and guardrails. |
| OpenAI Codex | [Built-in subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) | Bounded specialists, parent aggregation, status inspection and shared parent permission mode. Actual session tools require actual calls and observed results. |
| Claude Agent SDK | [Subagents](https://code.claude.com/docs/en/agent-sdk/subagents), [permissions](https://code.claude.com/docs/en/agent-sdk/permissions) | Context-isolated bounded workers, final results and tool limits; explicit permission controls. |
| LangChain / LangGraph | [LangChain agents](https://docs.langchain.com/oss/python/langchain/agents), [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [error and workflow design](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph) | LangChain's agent tool loop uses LangGraph primitives; checkpoints and thread resume; separate transient retry, agent recovery, human pause and unexpected failure. |
| Microsoft Agent Framework | [Overview](https://learn.microsoft.com/en-us/agent-framework/overview/) | Explicit workflows for defined processes; documented successor of AutoGen and Semantic Kernel. |
| Google ADK | [Workflow agents](https://adk.dev/agents/workflow-agents/) | Deterministic sequential, parallel and loop workflows; the page distinguishes Python/Go ADK 2.0 graph and dynamic workflows. |
| Mastra | [Agentic workflows](https://mastra.ai/articles/agentic-workflows), [snapshots](https://mastra.ai/en/reference/workflows/snapshots) | The opened workflow article supports persistence, parallel execution and suspend/resume. Official search retrieved the snapshots body; direct snapshot retrieval was unavailable in the final reference check. |
| Temporal, a durable workflow system | [Tasks](https://docs.temporal.io/tasks), [workflow definitions](https://docs.temporal.io/workflow-definition) | History replay, task versus business-execution failure, and separate external/non-deterministic activities. |

## Packet-text screening applicability

The public development-task packet builder receives free text at a source
boundary. Explicit credential assignments and recognizable credential formats
remain denied across packet fields. Common words such as `state`, `session`,
`code`, `sig` and `signature` require protocol context so ordinary descriptive
prose and labels remain usable. These references support that local distinction;
they do not define local policy or add a runtime dependency.
Canonical behavior owner: [system specification](../system-specification.md#development-task-packet-text-screening).
Work trace: `.agent/work/vida-final-assurance-finish-20261001/WORK.md`.

| Topic | Official reference | Applicability |
| --- | --- | --- |
| Sensitive values and session identifiers | [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Credentials, tokens and session identifiers need protection. A blanket word list can misclassify ordinary text; evaluate the surrounding context. |
| Classification and redaction | [Microsoft logging source generation and redaction](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/source-generation) | The documented logging pipeline classifies sensitive data and selects redactors by classification, supporting explicit sensitive categories rather than treating every short label as a secret. |
| Payload-bearing diagnostics | [OpenAI Node SDK client configuration](https://github.com/openai/openai-node/blob/main/docs/configuration.md) | SDK debug logs may include request and response bodies even when some authentication headers are redacted. Free-text packet fields therefore remain a relevant input boundary. |
| OAuth values and bearer credentials | [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html), [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html) | `state` and authorization `code` are meaningful in OAuth response context; bearer credentials remain recognizable credentials. The local screen preserves context-qualified checks while allowing ordinary labels. |
| OIDC nonce | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) | `nonce` is meaningful in the ID Token and replay-checking context; the local screen treats protocol-qualified values as sensitive. |
| SAML response | [OASIS SAML 2.0 technical overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) | The `SAMLResponse` parameter carries the encoded SAML response in the HTTP POST binding; qualified response values remain sensitive. |

## Current defect applicability

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
