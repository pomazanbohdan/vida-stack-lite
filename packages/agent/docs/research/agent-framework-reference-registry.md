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

## Current defect applicability

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
