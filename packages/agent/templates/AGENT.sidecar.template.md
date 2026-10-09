# Project context

Repository: {{REPOSITORY}}
Selected projects: {{PROJECTS}}
Runtime bundle: {{BUNDLE}}
Machine configuration: agent-runtime.config.v1.yaml

This project-owned sidecar is the source map for business requirements, system specifications, code, tests and operational evidence. Replace the entries below with the project's authoritative sources before development; do not invent missing requirements.

- Business requirements: not yet supplied by the project owner.
- System specifications and acceptance: not yet supplied by the project owner.
- Product code: src/.
- Product tests: tests/; project validation commands require owner configuration.
- Project documentation: docs/.
- Documentation policy: docs/agent-instructions/documentation-policy.v1.json; supply a current schema-valid project policy before operations that require it.
- Working artifacts: .agent/work/; coordination: .agent/coordination/.
- Delivery destinations and user testing: require explicit project values and attributable acceptance.

Framework documentation and agent instructions stay inside the runtime bundle. Project documents and operational state stay outside it. Provider and tenant details belong only to the integration bindings in the root configuration; they are not policy or project identity. Differential comparison is disabled for a new project until an explicit reference implementation is configured; that does not mark migration parity as passed.

Project initialization creates configuration, project instruction instances and
operational data. It does not copy runtime implementation, dependencies, schemas
or template Source into the project. Product code keeps its project-owned source
location. The runtime package owns the initializer and upgrade implementation.

Initialization preserves these project files on repeat runs. Template updates do not overwrite project values. Before any future current-v1 schema change affecting active artifacts, implement and ship one functional bundle-owned artifact repair command with atomic application and recovery; until then, stop before changing those artifacts.

Template owner: framework. Canonical template contract: bundle README.md and current v1 configuration schema. After initialization this file belongs to the project owner.
