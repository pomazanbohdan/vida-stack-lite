---
instruction_id: write-the-task-so-another-agent-needs-no-clarification
title: Write the task so another agent needs no clarification
summary: "A task is written so that another instance can execute it without asking a clarifying question; when it cannot, the task carries the specifics instead of the intention."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A task of the plan is written.
conditions_does_not_apply_when: The task is a one-line change with nothing to clarify.
artifact_contract_output_type: executable-task
artifact_contract_required_data:
  - the task as written
  - the specifics it names
artifact_contract_verified_by: another instance could execute the task without asking a clarifying question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Write the task so another agent needs no clarification
**Specificity test:** Could a different
instance execute the task without asking clarifying questions? If not, add more detail.
| TOO VAGUE | JUST RIGHT |
|-----------|------------|
| "Add authentication" | "Add JWT auth with refresh rotation using jose library, store in httpOnly cookie, 15min access / 7day refresh" |
| "Create the API" | "Create POST /api/projects endpoint accepting {name, description}, validates name length 3-50 chars, returns 201 with project object" |
| "Style the dashboard" | "Add Tailwind classes to Dashboard.tsx: grid layout (3 cols on lg, 1 on mobile), card shadows, hover states on action buttons" |
| "Handle errors" | "Wrap API calls in try/catch, return {error: string} on 4xx/5xx, show toast via sonner on client" |
| "Set up the database" | "Add User and Project models to schema.prisma with UUID ids, email unique constraint, createdAt/updatedAt timestamps, run prisma db push" |
