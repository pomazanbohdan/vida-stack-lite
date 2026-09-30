# OpenAI execution backends

Owner: agent product maintainer. Class: supporting research evidence.
This is a source-linked research note, not a ResearchResult runtime receipt,
provider activation grant, native execution observation or user acceptance.
Architecture owner: `../system-specification.md`.

## Verified primary-source facts

The beta OpenAI Agents API is a managed execution surface with sessions,
turns, events, durable continuation and required actions.
[Overview](https://developers.openai.com/api/docs/guides/agents-api/overview),
[Quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart),
[Session management](https://developers.openai.com/api/docs/guides/agents-api/sessions/manage),
[Multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent).

The Agents SDK is a separate application-owned TypeScript/Python runner with
results, guardrails, approval interruptions and resumable runner state. API
required actions do not establish attributable human approval; SDK approval
state supplements the runtime's own approval and CAS boundaries.
[SDK guide](https://developers.openai.com/api/docs/guides/agents/sdk),
[Guardrails and approvals](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals),
[Results](https://developers.openai.com/api/docs/guides/agents/results).

Codex SDK is a local thread-runner surface. It is not evidence that this
runtime currently operates Desktop tools through an API. Experimental App
Server support is not a production guarantee or a migration dependency.
[Codex SDK](https://learn.chatgpt.com/docs/codex-sdk),
[App Server](https://learn.chatgpt.com/docs/app-server).

## Accepted user direction and current status

The current user-directed sequence is an OpenAI API integration, then Agents
SDK, with Codex support wrapped around a generic core that can support other
connectors. The Plugin owner separately confirmed that the plugin targets
Codex while the agent remains generic. These decisions are attributable to
the current migration discussion recorded in the repository work record;
they do not approve paid API execution or enable a provider.

The existing native-session adapter remains current. Mastra owns the outer
stage graph; HostState owns issuance/report CAS, leases and ownership; existing
Cedar/Edictum boundaries keep their policy/evidence role. No API/SDK dependency
or provider call has been added by this research or relocation.

## Proposed adapter boundary and open decisions

An adapter consumes one already-issued role action and normalizes actual
status/output/artifact and opaque backend session/turn/event/call references.
Pending actions stay pending; idle is not success, and unknown effects are not
automatically repeated. This proposal must be verified before implementation.

Credentials, allowed scopes, costs, execution environment, data handling and
activation remain explicit owner decisions. Keep secrets outside documents.
The beta API's documented US-region, zero-data-retention eligibility and cost
constraints must be checked against the intended deployment before activation;
they are not implied permissions or existing deployment properties.
[API overview and availability](https://developers.openai.com/api/docs/guides/agents-api/overview).
TypeScript is an implementation recommendation for the SDK adapter because the
current runtime is TypeScript; the generic adapter contract mandates neither
that language nor Codex as a host.
Developer unblocking and lawful npm migration precede adapter implementation.
Relations: this evidence documents the architecture and informs its future
adapter acceptance; it does not supersede the lifecycle authority.
