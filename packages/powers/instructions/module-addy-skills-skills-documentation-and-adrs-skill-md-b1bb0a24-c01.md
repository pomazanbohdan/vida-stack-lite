---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-documentation-and-adrs-skill-md-b1bb0a24-c01"
title: "addy-skills: skills/documentation-and-adrs/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/documentation-and-adrs/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/documentation-and-adrs/SKILL.md\"}"
atom_ids:
  - document-public-api-contracts
  - keep-the-agent-facing-docs-current
  - match-the-existing-convention-before-writing-an-adr
  - record-decisions-as-adrs
  - record-shipped-changes-in-a-changelog
  - review-the-prose-without-changing-the-facts
  - write-a-readme-a-newcomer-can-follow
  - write-few-meaningful-comments
atom_count: 8
atoms: "[{\"atom_id\":\"document-public-api-contracts\",\"file_sha256\":\"cd30eb08b4df2096271e85f8b7adb1784162ae68c992e0cb9da4b0103e8b0dfa\",\"content_sha256\":\"ace145e673ae99f4f759c8dae442fa9bcc110dbc89af92b05c26de7847554bdc\",\"file_bytes\":2467,\"body_bytes\":1361},{\"atom_id\":\"keep-the-agent-facing-docs-current\",\"file_sha256\":\"7f4c4a200f5d05349e069df27c2dc7e58dadfd289f7ca3f466e84168f110aa05\",\"content_sha256\":\"f7d2d97079b4fa1933186d3750d392731d2d689572739afcb3db92bbb04d19a3\",\"file_bytes\":2221,\"body_bytes\":776},{\"atom_id\":\"match-the-existing-convention-before-writing-an-adr\",\"file_sha256\":\"2c4e67d8e0738dd47011a962a0bd0919c3f00dc1ab0471486df0c4075cbcea64\",\"content_sha256\":\"8ae374ffc8d4f2af06f1ba6ae7e5b265baaece0a47ac1e96ab54acb67128f2e7\",\"file_bytes\":2144,\"body_bytes\":972},{\"atom_id\":\"record-decisions-as-adrs\",\"file_sha256\":\"b2281282f639fd0eca9f06c6ef56e3abd62c15663a2612dc687a6403efaee4ef\",\"content_sha256\":\"a38930ad19495e1fe4aba1dfb4d5cd2a06555982f7da7f9cf9ca07eda8a239e7\",\"file_bytes\":7267,\"body_bytes\":5408},{\"atom_id\":\"record-shipped-changes-in-a-changelog\",\"file_sha256\":\"13066a69649b771bf73204c9dceab70b789b286e39602290ba96698de521b69c\",\"content_sha256\":\"b4950752348ea5b6ebd95f4aa3aef7c5224b5c55e5dfe94a70f290a7501a61e3\",\"file_bytes\":1538,\"body_bytes\":405},{\"atom_id\":\"review-the-prose-without-changing-the-facts\",\"file_sha256\":\"735fe4a560ef7ab8c363e5235b8526be8c8e80a1a02bd2c2b43dadaa820f15e5\",\"content_sha256\":\"e4ec18047c206ff68ef88a96d2331ea6880c30477e5fb2e21508b847dea29766\",\"file_bytes\":2122,\"body_bytes\":963},{\"atom_id\":\"write-a-readme-a-newcomer-can-follow\",\"file_sha256\":\"dc94c14254adc5096938d390c503f613902a32b0919515c1285abd3a5ccf05e9\",\"content_sha256\":\"f8a76a7c0a56cf01356c2d1dd927744482ec2598ac2e6ef328f3fef57baa9022\",\"file_bytes\":1920,\"body_bytes\":782},{\"atom_id\":\"write-few-meaningful-comments\",\"file_sha256\":\"f2f4679c23af8a19ce98c060dd053b3255c9f8bb303fd647929473754c1ba67c\",\"content_sha256\":\"754d5b3d304b54f4611dfe87f7be8b504e4cc4684e9466de3a19aef7b83d7a2b\",\"file_bytes\":4035,\"body_bytes\":2823}]"
carrier_sha256: 73452ff16a62755a7d558ed9353fe90ddbafa7b9b82187bd610878bfe2c17965
carrier_bytes: 24743
revision: 1
status: active
---
<!-- vpmodule:atom:begin document-public-api-contracts -->
---
instruction_id: document-public-api-contracts
title: Document the public contract of an interface
summary: "Public functions carry their parameters, their result and their failure modes, where the caller will look for them."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: "You add or change a public function, endpoint or interface."
conditions_does_not_apply_when: The interface is private to one module and has no external caller.
artifact_contract_output_type: api-documentation
artifact_contract_required_data:
  - the parameters
  - the result
  - the failure modes
  - the form used for the interface
artifact_contract_verified_by: a caller can use the interface from the documentation alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Document the public contract of an interface

For public APIs (REST, GraphQL, library interfaces):

**Inline with Types (Preferred for TypeScript)**

```typescript
/**
 * Creates a new task.
 *
 * @param input - Task creation data (title required, description optional)
 * @returns The created task with server-generated ID and timestamps
 * @throws {ValidationError} If title is empty or exceeds 200 characters
 * @throws {AuthenticationError} If the user is not authenticated
 *
 * @example
 * const task = await createTask({ title: 'Buy groceries' });
 * console.log(task.id); // "task_abc123"
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // ...
}
```

**OpenAPI / Swagger for REST APIs**

```yaml
paths:
  /api/tasks:
    post:
      summary: Create a task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Validation error
```

APIs stabilize faster when you document them. The doc is the first test of the design.

**Red Flags**

- Public APIs with no documentation or types
<!-- vpmodule:atom:end document-public-api-contracts -->
<!-- vpmodule:atom:begin keep-the-agent-facing-docs-current -->
---
instruction_id: keep-the-agent-facing-docs-current
title: Keep the agent-facing docs current
summary: "Conventions, specs, decision records and inline gotchas are what an agent reads; keep them current so it builds the right thing and does not re-decide."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A convention, a spec, a decision or a known trap changed, and an agent will act on it."
conditions_does_not_apply_when: The change is internal to one implementation and carries no guidance.
artifact_contract_output_type: agent-docs-update
artifact_contract_required_data:
  - "the convention, spec, decision or gotcha that changed"
  - where it is written
  - that it is current
artifact_contract_verified_by: an agent reading the current document gets the current rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/agent-contracts.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/documentation-generation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the agent-facing docs current

Special consideration for AI agent context:

- **Rules files** — Document project conventions so agents follow them
- **Spec files** — Keep specs updated so agents build the right thing
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps

**Red Flags**

- "Nobody reads docs" Agents do. Future engineers do. Your 3-months-later self does.
Update this table whenever an agent's return contract changes -- a stale row is a violation the check will report, not something to leave for later.
an auditable exemption, never deleted and never silently passed.
System MUST verify generated documentation against actual implementation
<!-- vpmodule:atom:end keep-the-agent-facing-docs-current -->
<!-- vpmodule:atom:begin match-the-existing-convention-before-writing-an-adr -->
---
instruction_id: match-the-existing-convention-before-writing-an-adr
title: Match the existing convention before writing a record
summary: "Find the project's established convention for the record and follow it; fall back to a default only when no convention exists."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A decision record is about to be written into a project.
conditions_does_not_apply_when: The convention was already established in this session.
artifact_contract_output_type: convention-match
artifact_contract_required_data:
  - the convention that was found
  - "the location, format, numbering and headings it fixes"
  - any conflict that was surfaced
artifact_contract_verified_by: the new record follows the convention that the project already uses
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Match the existing convention before writing a record

Before creating an ADR, inspect the available repository context for an established convention — existing ADRs, project instructions, and ADR-related configuration or tooling. An established convention overrides the defaults below. Match:

- **Location and format** — e.g. `docs/adr/*.md`, `Documentation/Decisions/*.rst`, a MADR layout, or an `adr-tools` setup. Match the existing directory, file extension, and markup (Markdown vs reStructuredText).
- **Numbering and naming** — continue the existing sequence and filename pattern (`ADR-004-Title.rst`, `0004-title.md`, …); don't restart at 001 or introduce a second scheme.
- **Section headings** — reuse the project's heading set rather than imposing this template's.

If the available evidence conflicts, surface the conflict rather than silently introducing another scheme. Only when no convention can be established do you apply the default below.
<!-- vpmodule:atom:end match-the-existing-convention-before-writing-an-adr -->
<!-- vpmodule:atom:begin record-decisions-as-adrs -->
---
instruction_id: record-decisions-as-adrs
title: Record decisions as ADRs
summary: "Record a decision as a short ADR only when it is hard to reverse, surprising without context, and the result of a real trade-off."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A design decision has been made and might need its reasoning later.
conditions_does_not_apply_when: "The decision is easy to reverse, unsurprising, or had no real alternative."
artifact_contract_output_type: adr
artifact_contract_required_data:
  - context
  - decision
  - reason
  - number
artifact_contract_verified_by: the ADR exists only when all three conditions held
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/domain-modeling/SKILL.md
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/domain-modeling/ADR-FORMAT.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/finish-an-epic.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/assets/sample-skill/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/adr/README.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Record decisions as ADRs
Offer ADRs sparingly. Only offer to create an ADR when all three are true:
1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons
If any of the three is missing, skip the ADR. If a decision is easy to reverse, skip it: you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."
ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc. Create the `docs/adr/` directory lazily: only when the first ADR is needed. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why*, not in filling out sections. Scan `docs/adr/` for the highest existing number and increment by one.
What qualifies:
- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment target. Not every library: just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because X." Anything where a reasonable reader would assume the opposite. These stop the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements." "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it; otherwise someone will suggest GraphQL again in six months.

Document decisions, not just code. The most valuable documentation captures the *why* — the context, constraints, and trade-offs that led to a decision. Code shows *what* was built; documentation explains *why it was built this way* and *what alternatives were considered*. This context is essential for future humans and agents working in the codebase.

### ADR Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.

A 10-minute ADR prevents a 2-hour debate about the same decision six months later.
Verify proposals like any claim, then ask the user about each, interactively only, and record the answer beside the proposal.
The review proposes; you decide what runs.
Nothing touches your code or your specs automatically.
Spec reconciliations arrive with the evidence attached, for you to apply to the project contract by hand.
An uncertain interpretation never gets written into a spec on its own.
Decision records (ADRs) are written beside the code they govern only when you approve each one, and committing them is up to you.
Each option gets one line on why it lost.
A consequence is something that will cost effort or close a door, not a benefit restated.
### ADR status vocabulary
Every ADR declares one status from a canonical vocabulary:
| Status | Means | Obligation |
|--------|-------|------------|
| `Accepted` | Decided and in force. Cite it. | — |
| `Proposed` | Decided in principle, not ratified. Do not cite as settled. | If the work has demonstrably shipped, ratify it — do not leave the label lying. |
| `Superseded` | A specific newer ADR replaced this decision. | **Must name the successor as a file link.** |
| `Retired` | What this ADR decided no longer exists at all, and no single ADR replaced it. | Say what was removed and when. |
| `Legacy` | Frozen historical record, kept for provenance; not a pattern to follow. | Say why it is frozen. |
Prose may follow the token; both the bullet form and the table form are accepted.
`Supersedes` / `Superseded by` — the target is *replaced*. Its status becomes `Superseded`.
`Subsumes` / `Subsumed by` — the target *still holds*, but a broader ADR now frames it. Its status is **unchanged**; it becomes a component of the larger decision.
If A declares either relation toward B, **B must record the reciprocal.**
A one-way pointer is the failure this corpus actually suffered.
Only an `Accepted` ADR is owed the back-link.
A `Proposed` ADR's claim is **prospective**: it has not taken effect, so its target is not marked.
On ratification, the check begins demanding the back-links.
A **separate** ADR that amends another is the same relation as Supersedes/Subsumes and follows the same rule: if A declares `**Amends:** [ADR-B]`, B **must** carry the reciprocal `**Amended by:** [ADR-A]` in the same PR.
The id in the title must match the filename's prefix.
If the H1 ends in a bracket holding a status token, it must name the **same** status as the `Status` field.
Cross-references to other ADRs are file links, never bare ids.
<!-- vpmodule:atom:end record-decisions-as-adrs -->
<!-- vpmodule:atom:begin record-shipped-changes-in-a-changelog -->
---
instruction_id: record-shipped-changes-in-a-changelog
title: Record shipped changes in a changelog
summary: "For shipped features, write the version, the date, the categories of change, and the reference that produced each entry."
capability_tags:
  - write-technical-prose
pattern_tags:
  - output-formatting
conditions_applies_when: A feature or a fix ships.
conditions_does_not_apply_when: The change is not released yet.
artifact_contract_output_type: changelog-entry
artifact_contract_required_data:
  - the version
  - the date
  - the category of each change
  - the reference for each change
artifact_contract_verified_by: the shipped change appears under its version and category
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body supplies a changelog sample but no supported principle, conditional rule, ordered procedure, or unordered checks."
---

# Record shipped changes in a changelog

For shipped features:

```markdown
# Changelog

## [1.2.0] - 2025-01-20
### Added
- Task sharing: users can share tasks with team members (#123)
- Email notifications for task assignments (#124)

### Fixed
- Duplicate tasks appearing when rapidly clicking create button (#125)

### Changed
- Task list now loads 50 items per page (was 20) for better UX (#126)
```
<!-- vpmodule:atom:end record-shipped-changes-in-a-changelog -->
<!-- vpmodule:atom:begin review-the-prose-without-changing-the-facts -->
---
instruction_id: review-the-prose-without-changing-the-facts
title: Review the prose without changing the facts
summary: "Edit the wording of a document for the people who will read it, and restore anything the edit drops: qualifiers, caveats, numbers and trade-offs."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: An existing document is edited for clarity.
conditions_does_not_apply_when: The document is new and has no source to compare against.
artifact_contract_output_type: prose-review
artifact_contract_required_data:
  - the details marked to survive
  - the passages rewritten
  - the qualifiers and caveats restored
  - the unresolved factual questions
artifact_contract_verified_by: every marked detail is still present in the edited document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Review the prose without changing the facts

After checking the technical content, review the prose for the people who will use it. Clearer wording must not change the decision or its limits.

1. Mark the details that must survive the edit: names, numbers and units, commands, paths, links, conditions, trade-offs, and uncertainty. Check them against the available code and decision context; flag anything you cannot substantiate.
2. Replace stock introductions, promotional adjectives, and repeated summaries with the concrete information the reader needs. Do not replace an unsupported claim with an invented example or a stronger guarantee. Keep necessary technical repetition and the project's established terminology.
3. Compare the edited document with the original and its sources. Restore any lost qualifier or caveat, verify command and code examples still work as documented, and explain any unresolved factual question rather than polishing it away.
<!-- vpmodule:atom:end review-the-prose-without-changing-the-facts -->
<!-- vpmodule:atom:begin write-a-readme-a-newcomer-can-follow -->
---
instruction_id: write-a-readme-a-newcomer-can-follow
title: Write a README a newcomer can follow
summary: "The README says what the project is, how to run it, what the commands do, how it is put together, and how to contribute."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: "A project has no README, or its README cannot get a newcomer running."
conditions_does_not_apply_when: The document set of the project is scoped to something other than a README.
artifact_contract_output_type: readme
artifact_contract_required_data:
  - one-paragraph description
  - quick start
  - commands
  - architecture overview
  - contributing
artifact_contract_verified_by: "a newcomer can install, run and find the commands from the README alone"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write a README a newcomer can follow

Every project should have a README that covers:

```markdown
# Project Name

One-paragraph description of what this project does.

## Quick Start
1. Clone the repo
2. Install dependencies: `npm install`
3. Set up environment: `cp .env.example .env`
4. Run the dev server: `npm run dev`

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run tests |
| `npm run build` | Production build |
| `npm run lint` | Run linter |

## Architecture
Brief overview of the project structure and key design decisions.
Link to ADRs for details.

## Contributing
How to contribute, coding standards, PR process.
```

**Red Flags**

- README that doesn't explain how to run the project
<!-- vpmodule:atom:end write-a-readme-a-newcomer-can-follow -->
<!-- vpmodule:atom:begin write-few-meaningful-comments -->
---
instruction_id: write-few-meaningful-comments
title: Write few meaningful comments
summary: "Delete comments the code already tells you, keep the ones about constraints you cannot change, and encode those constraints in structure where possible."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: You add or review comments in code.
conditions_does_not_apply_when: The comment is a required element of an external format.
artifact_contract_output_type: commented-code
artifact_contract_required_data:
  - reason
  - scope of the pass
  - comments removed
  - check that each kept comment matches current code
artifact_contract_verified_by: each remaining comment checked against the current code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/no-comments/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write few meaningful comments
Use the caller's files or diff; otherwise use the current diff against the base branch, default main, including the working tree.
Inspect the report and the diff.
Reject application-code edits, scope escapes, exception-protected deletions, misstated kill reasons, and flags that treat kept intentional code as guilty.
Reshape flags on surprises in our own code stay actionable.
Do not restore those comments.
A keep survives only with proof it is about something we cannot change.
Audit missed scoped lint and type suppressions.
Correctness or safety suppressions stay actionable kills.
Restore deletions only with exact exceptions and scoped proof.
Before accepting thin "IMPORTANT" or "do not remove" kills or keeps, ask how or why the symbol is used.
If a kill is ambiguous, do not restore.
If a keep is refuted or still ambiguous, delete it.
Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API.
If any fix needs a shape, sketch it once for the accepted set and surrounding code; stop at the sketch.
Implement the smallest root-cause fix in scope.
Remove every named workaround.
If the root cause is out of scope, land the smallest in-scope fix and report the rest open.
Never bolt on symptom guards.
Constraint comments say "do not remove", "do not change wording", or "talk to X before changing".
Leave keeps about things we cannot change.
Offer the cheapest in-scope type, runtime, test, or CI lint; wait for approval.
If approved, encode the constraint then delete the comment.
Otherwise delete it, report the constraint open, and sketch out-of-scope work.
Report the deletion count, restored comments, reruns, sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.

Don't document obvious code. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

Comments on *why* are stable. Comments on *what* get outdated — that's why you only write the former.

### When NOT to Comment

```typescript
// Don't comment self-explanatory code
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Don't leave TODO comments for things you should just do now
// TODO: add error handling  ← Just add it

// Don't leave commented-out code
// const oldImplementation = () => { ... }  ← Delete it, git has history
```

### Document Known Gotchas

```typescript
/**
 * IMPORTANT: This function must be called before the first render.
 * If called after hydration, it causes a flash of unstyled content
 * because the theme context isn't available during SSR.
 *
 * See ADR-003 for the full design rationale.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```
<!-- vpmodule:atom:end write-few-meaningful-comments -->