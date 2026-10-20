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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 1
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
