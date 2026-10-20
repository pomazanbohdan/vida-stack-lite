---
instruction_id: select-model-per-task
title: Обирай виконавця за складністю задачі
summary: "Доручай кожну роль найдешевшому виконавцю, який її витримає, і явно називай вибір."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: Задачу або перегляд треба доручити окремому виконавцю.
conditions_does_not_apply_when: Роботу виконує той самий виконавець без вибору рівня.
artifact_contract_output_type: worker-selection
artifact_contract_required_data:
  - складність задачі
  - обраний рівень
  - причина вибору
artifact_contract_verified_by: worker capability matches recorded task complexity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 1
---

# Обирай виконавця за складністю задачі
Визнач складність кожної задачі перед дорученням.
Для механічної роботи з повним описом обери найдешевшого виконавця.
Для інтеграції кількох файлів обери середній рівень.
Для архітектурного рішення обери найздатнішого.
Для перегляду масштабуй вибір за розміром і ризиком зміни.
Для малого виправлення після перегляду обери дешевий рівень.
Для повторних раундів виправлення піднімай рівень виконавця.
Враховуй кількість кроків, а не лише ціну токена.
Не залишай вибір за замовчуванням.
Називай обраного виконавця явно в дорученні.
Перевір, що виконавець справді має потрібні можливості.
Не доручай перегляд тому, хто створював зміну.
Не підвищуй рівень без причини.
Зафіксуй вибір разом із задачею.
Повідом, якщо потрібного рівня немає.
