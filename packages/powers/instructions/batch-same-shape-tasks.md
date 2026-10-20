---
instruction_id: batch-same-shape-tasks
title: "Об'єднуй дрібні однотипні задачі в одне доручення"
summary: "Кілька малих однакових правок передавай одним пакетом, а не окремим виконавцем на кожну."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: План містить кілька малих правок однакової форми.
conditions_does_not_apply_when: "Кожна задача потребує власного рішення, тестів або перегляду."
artifact_contract_output_type: batched-dispatch
artifact_contract_required_data:
  - файли
  - зміни
  - спільні обмеження
  - перевірка
artifact_contract_verified_by: one diff reviewed as a unit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 1
---

# Об'єднуй дрібні однотипні задачі в одне доручення
Визнач, чи задачі мають однакову форму.
Перевір, чи кожна є малою незалежною правкою.
Переліч усі файли й зміни в одному брифі.
Передай пакет одному виконавцю.
Переглянь пакет як одну зміну.
Не дробіть пакет на окремі доручення.
Не додавай у пакет задачу, яка потребує окремого рішення.
Не додавай задачу з власними тестами.
Не додавай задачу з окремою поверхнею перегляду.
Збережи спільні обмеження пакета.
Перевір повний диф пакета.
Запусти повний набір тестів.
Повідом, які файли змінено.
Не вважай пакет дозволом розширити обсяг.
Зупини пакет, якщо правки перестали бути однотипними.
