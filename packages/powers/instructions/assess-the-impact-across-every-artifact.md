---
instruction_id: assess-the-impact-across-every-artifact
title: Assess the impact across every artifact
summary: "Trace a significant change through the requirements, the design, the interface, the infrastructure and the tests, and record what each one needs."
capability_tags:
  - assess-change-impact
pattern_tags:
  - change-impact-assessment
conditions_applies_when: A change significant enough to move the project direction is being assessed.
conditions_does_not_apply_when: "The change is local, reversible and touches no shared artifact."
artifact_contract_output_type: impact-assessment
artifact_contract_required_data:
  - the artifacts examined
  - the impact per artifact
  - the sections that need an update
artifact_contract_verified_by: every artifact that the change touches is named with the sections it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/checklist.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
status: active
revision: 1
---

# Assess the impact across every artifact
Course correction needs broad project context to assess change impact accurately.
Load all available planning artifacts.
Check each area for impact:
System components and their interactions
Architectural patterns and design decisions
Technology stack choices
Data models and schemas
API designs and contracts
Integration points
Check for impact on:
User interface components
User flows and journeys
Wireframes or mockups
Interaction patterns
Accessibility considerations
Review additional artifacts for impact:
Deployment scripts
Infrastructure as Code (IaC)
Monitoring and observability setup
Testing strategies
Documentation
CI/CD pipelines
Document any secondary artifacts requiring updates
