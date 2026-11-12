---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-agent-po-references-validate-checks-md-1b1f9a3a-c01"
title: "bmad-method: skills/bmad-agent-po/references/validate-checks.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-agent-po/references/validate-checks.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-agent-po/references/validate-checks.md\"}"
atom_ids:
  - a-builder-must-be-able-to-write-the-criteria
  - every-requirement-has-an-accountable-epic
  - list-what-must-exist-before-each-item-can-start
  - name-the-handoff-in-both-descriptions
  - the-set-must-satisfy-the-done-when
atom_count: 5
atoms: "[{\"atom_id\":\"a-builder-must-be-able-to-write-the-criteria\",\"file_sha256\":\"9557f080d0551c2ed9946ddf6c4a52e8422ccfa3b478cb0f00af64f7be31572e\",\"content_sha256\":\"e428102bf3868e80a553198033771ab2fe9d2d2d4e5c99d865bcd03ebd8ea1b8\",\"file_bytes\":1553,\"body_bytes\":292},{\"atom_id\":\"every-requirement-has-an-accountable-epic\",\"file_sha256\":\"56f9293c1853d4ad19d42e0481a94bd0ab317094679a282743c63fbec6b15eed\",\"content_sha256\":\"fb42a17815c8ebc8d7ab97e0677d722b7f0794b6d1cc0b85640b10415ae0f1c8\",\"file_bytes\":1963,\"body_bytes\":473},{\"atom_id\":\"list-what-must-exist-before-each-item-can-start\",\"file_sha256\":\"eaf7613f03522dd985d12b68cc48de7e94e7e7b1401d8392e0d6f3a677995ded\",\"content_sha256\":\"20d0733917576abde5acb0d1d15491e7488d12af52d03a63a46a7f60daddc30a\",\"file_bytes\":1444,\"body_bytes\":303},{\"atom_id\":\"name-the-handoff-in-both-descriptions\",\"file_sha256\":\"d27e89ecf79e85d746a81d2cbe985b989d18d8e6fecca85b768e6cff3e20e90a\",\"content_sha256\":\"811e41b9329ad4bff4ba7f92a39600a8a28fdcecf3181dcdc6cc2274eeb8be3f\",\"file_bytes\":1284,\"body_bytes\":196},{\"atom_id\":\"the-set-must-satisfy-the-done-when\",\"file_sha256\":\"d5175b5e68f9e3aff40ff0bfbcbe7323aaf72b71924698078686994bb74c1361\",\"content_sha256\":\"8a96f4380341b78f23201672b38cdc631cab5804166dcb10674cbd757f05efcb\",\"file_bytes\":1719,\"body_bytes\":490}]"
carrier_sha256: ce13dadb8f8a2a765e5448915942342b0b05734738c004dd9b86925f06a13769
carrier_bytes: 8658
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-builder-must-be-able-to-write-the-criteria -->
---
instruction_id: a-builder-must-be-able-to-write-the-criteria
title: A builder must be able to write the criteria
summary: "Given the container, the item and its references, a builder could write that item's acceptance criteria; when they could not, the container's requirements or the references are fixed instead."
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: An item is checked for whether it can be built from.
conditions_does_not_apply_when: The item already carries its full criteria.
artifact_contract_output_type: buildability-check
artifact_contract_required_data:
  - "the container, the item and its references"
  - the criteria a builder could write from them
  - what is missing when they could not
artifact_contract_verified_by: "a builder could write the item's acceptance criteria from the container, the item and its references"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# A builder must be able to write the criteria
Given the epic, an entry, and its references, a builder could write that story's acceptance criteria if it had to. If it could not, fix the epic's requirements or the references; the entry stays one sentence each for `description` and `verify`.
<!-- vpmodule:atom:end a-builder-must-be-able-to-write-the-criteria -->
<!-- vpmodule:atom:begin every-requirement-has-an-accountable-epic -->
---
instruction_id: every-requirement-has-an-accountable-epic
title: Every requirement has an accountable container
summary: "Every requirement of the whole body of work has a container that owns it, a child initiative on a parent, or an agreed deferral; every unit the work touches is a container, a touch point or named out of scope."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A whole initiative is checked against its source.
conditions_does_not_apply_when: The check is on one container only.
artifact_contract_output_type: ownership-check
artifact_contract_required_data:
  - each requirement and the container that owns it
  - the agreed deferrals
  - the part each container delivers of a shared requirement
artifact_contract_verified_by: every requirement has an accountable container or an agreed deferral
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Every requirement has an accountable container
Every initiative requirement has an accountable epic, a child initiative when this is a parent initiative, or an agreed deferral. Shared requirements say which part each accountable unit delivers; no unexplained overlap.
Every unit the source touches is an epic, a touch point (a unit the work only consumes or configures, named in the initiative's Boundaries with the epic that owns the work there), or named out of scope.
<!-- vpmodule:atom:end every-requirement-has-an-accountable-epic -->
<!-- vpmodule:atom:begin list-what-must-exist-before-each-item-can-start -->
---
instruction_id: list-what-must-exist-before-each-item-can-start
title: List what must exist before each item can start
summary: "For every item, list what must exist before it can start and before its check can run; the item builds it itself or a dependency delivers it."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: The dependencies between items are worked out.
conditions_does_not_apply_when: The items have no dependencies.
artifact_contract_output_type: needs-list
artifact_contract_required_data:
  - what must exist before each item can start
  - what must exist before its check can run
  - the item that builds it
artifact_contract_verified_by: every item lists what must exist before it and before its check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# List what must exist before each item can start
Needs: list what must exist before each item can start and before its check can run: code, schema, setup, test tooling, fixtures, an entry point, a decision, an investigation's answer. The item builds it itself, or something in its `after` delivers it.
<!-- vpmodule:atom:end list-what-must-exist-before-each-item-can-start -->
<!-- vpmodule:atom:begin name-the-handoff-in-both-descriptions -->
---
instruction_id: name-the-handoff-in-both-descriptions
title: Name the handoff in both descriptions
summary: "Where one item relies on another's output — a default, an interface, a link target — both descriptions say so, so that neither builder invents its own."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: One item relies on the output of another.
conditions_does_not_apply_when: The items are independent.
artifact_contract_output_type: handoff-list
artifact_contract_required_data:
  - the output one item relies on
  - the item that produces it
  - the line in each description that names it
artifact_contract_verified_by: both descriptions name the handoff
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name the handoff in both descriptions
Handoffs: where one item relies on another's output (a default, an interface, a link target), both descriptions say so, so neither builder invents its own.
<!-- vpmodule:atom:end name-the-handoff-in-both-descriptions -->
<!-- vpmodule:atom:begin the-set-must-satisfy-the-done-when -->
---
instruction_id: the-set-must-satisfy-the-done-when
title: The set must satisfy the done when
summary: "The items of a set account for every requirement and for the work that has no id, and their combined result satisfies the container's done condition; citing an id alone is not coverage."
capability_tags:
  - verify-work-results
pattern_tags:
  - testable-criteria
conditions_applies_when: "A set of items is checked against the container's done condition."
conditions_does_not_apply_when: The container has no done condition.
artifact_contract_output_type: coverage-check
artifact_contract_required_data:
  - the requirements and the work the set accounts for
  - the part each item delivers
  - how the combined result satisfies the done condition
artifact_contract_verified_by: the combined result satisfies the done condition and no id is cited as coverage on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/validate-checks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# The set must satisfy the done when
Together the tickets account for every requirement in the epic's spec, referenced numbered source, or Requirements, except scope deferred with the user. Each `covers` id exists there; several tickets may cover one id, each description saying which part it delivers.
UX, architecture, constraints, and integration work are accounted for even when they lack ids. The combined results must satisfy the epic's Done when; citing an id alone is not coverage.
<!-- vpmodule:atom:end the-set-must-satisfy-the-done-when -->