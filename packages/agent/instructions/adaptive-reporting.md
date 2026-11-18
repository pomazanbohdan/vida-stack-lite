# Adaptive reporting

## Scope

This instruction governs messages to the user only.

It does not govern:

- documentation;
- agent-to-orchestrator handoff;
- code, tests or commit messages;
- donor text.

Documentation maintenance remains at the end of this file.

## Default contract

A user-facing result has four parts:

- **Outcome** — what is true now or what changed. One to three sentences.
- **Evidence** — actual checks, numbers, links. No claim without evidence.
- **Decision or GAP** — only when the user must decide or something is blocked.
- **Next** — one action.

Omit a part when it is empty. Do not add a section for its own sake.

## Message types

### Result

Use for completed work or a direct answer.

Outcome, Evidence, Next. Add Decision or GAP only when needed.

### Decision

Use when the user must choose.

Question, Why now, Options, Recommendation, Default.
One question. Two or three real options. State what happens if the user does not answer.

### Incident

Use when something failed or is at risk.

Impact, Cause, Fix, Evidence, Remaining risk.
Separate confirmed cause from GAP.

### Plan

Use when the user asks for a plan.

Goal, Steps, Checks, Stop conditions.
Three to seven steps.

### Explanation

Use only when the user asks, or when the decision cannot be made without it.
Answer first. Then the minimum explanation that changes the decision.

## Description budget

- No preamble.
- Do not restate the request.
- Do not narrate tool calls.
- Do not narrate internal command choreography unless the user is diagnosing the harness.
- Do not repeat instructions that already exist in the repository.
- Put the first concrete result before background.
- Keep a routine result to about eight lines.
- Expand only when the user asks, risk requires it, or the decision needs it.
- Move optional detail to a short `Details` block.

## Format

| Content | Format |
|---|---|
| One outcome | prose |
| Actions or acceptance | checklist |
| Mappings or comparisons | table |
| Flow, state or hierarchy | Mermaid only when materially clearer |

Do not create decorative or placeholder graphs.
Graphs are projections, not proof. State scope and limitations.
Distinguish Decision, Code, Static, Runtime and GAP.

## Evidence

Every claim has one class:

- **Decision** — what was decided.
- **Code** — what changed.
- **Static** — typecheck, lint or documentation check.
- **Runtime** — what was actually executed.
- **GAP** — what remains unknown.

Static never closes Runtime.
`passed` is impossible without actual execution.

## Language

Preserve the user's language.
Use short sentences, plain words, consistent terms and one idea per paragraph.
Aim for approximately 80% ASD-STE100 principles.
This is a style target, not a formal compliance claim or a measured score.

## Conflict precedence

1. Safety, permission and security.
2. The user's current explicit request.
3. `AGENTS.md` required report content.
4. This instruction for style and format.
5. The task-specific skill contract.
6. D11 for documentation language.

## Specific conflicts

- Requirements use RFC 2119 `MUST`, `SHOULD`, `MAY`. Procedures use imperative and avoid `SHOULD`.
- Documentation is English. Chat uses the user's language.
- Agent handoff stays structured. Do not apply chat style to it.
- A brainstorming question follows that skill's contract. It overrides the default result shape for that interaction.
- Use D13 severity only: Critical, Important, Minor. Do not import aviation severity.
- A skill's task contract wins over the default format when they conflict.

## Documentation maintenance

This section is not part of the user communication contract. It guides document writing. The lifecycle remains the owner of authority, mutation and assurance.

1. Update the existing authoritative document. Use the sidecar to find its owner and sources. Create a new instruction only when no current owner covers the subject. Derived guides must link to their canonical sources.
2. Keep active documents and code comments about current supported behavior. Remove dated run narratives, revision diaries, repeated correction notes, superseded instructions and commented-out former wording. Keep a compatibility rule when the supported surface still exists.
3. Keep history in Git, required external lineage and existing work/evidence stores. Preserve original failed and UNKNOWN receipts. Removing history from a living document does not erase audit evidence or turn a failure into a pass.
4. Apply the approximate ASD-STE100 target above. Preserve the document's language, precise technical terms and human intent. Use short sentences, consistent words and one idea per paragraph. Use checklists for actions and tables for mappings. Remove repetition. Do not claim a measured style score or formal compliance.
5. State current rules, commands, limits and unresolved GAPs clearly. Link to current operation evidence for installed versions, qualification and acceptance. Do not hard-code a live success claim in an instruction. Separate verified behavior, proposals and missing evidence.
6. Before shortening a material contract or test guide, map its current requirements to the proposed text. Preserve acceptance, exact commands, public contracts, security, safety and data rules, thresholds, explicit bounds and approved GAP dispositions. Do not change code, raise limits or skip checks to make the prose shorter. Retain detail at its existing authoritative owner and link to it.
7. Verify wording, command names, links and requirement preservation. Check the actual diff and existing ownership. Record the required lineage and current CLEAR. For prose-only edits, reuse applicable current code tests. Run affected behavioral checks only when behavior, a contract or an executable example changes. Keep required assurance; a documentation check is not Runtime acceptance.
8. When the user asks for size reduction, record actual file bytes before and after the completed edit. State the kB/KiB convention. Report the measured difference after reconciliation. A smaller file alone does not prove faster execution, corrected context binding or successful deployment.
