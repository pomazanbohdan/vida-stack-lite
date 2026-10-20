---
instruction_id: map-file-structure-before-tasks
title: Спершу визнач структуру файлів
summary: "До поділу на задачі виріши, які файли створюються чи змінюються і за що кожен відповідає."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: План охоплює кілька файлів або нових компонентів.
conditions_does_not_apply_when: Зміна торкається одного невеликого файлу без нових меж.
artifact_contract_output_type: file-structure-map
artifact_contract_required_data:
  - файли
  - відповідальність
  - інтерфейси
  - ризики
artifact_contract_verified_by: every planned file has one responsibility
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-plans/SKILL.md
status: active
revision: 1
---

# Спершу визнач структуру файлів
Переліч файли, які треба створити або змінити.
Назви відповідальність кожного файлу.
Дай кожному файлу одну чітку відповідальність.
Відділяй межі за відповідальністю, а не за технічним шаром.
Тримай файли достатньо малими для повного розуміння.
Дотримуйся наявних домовленостей проєкту.
Не перебудовуй наявну структуру без причини.
Познач файл, який уже завеликий, як окремий ризик.
Визнач інтерфейси між файлами.
Перевір, що структура підтримує незалежні задачі.
Не змішуй у файлі кілька відповідальностей.
Перевір, чи можна перевірити кожен файл окремо.
Не починай задачі до завершення карти файлів.
Зафіксуй карту в плані.
Онови карту, якщо структура змінилася.
