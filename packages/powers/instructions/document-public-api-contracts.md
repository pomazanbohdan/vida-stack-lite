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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
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
