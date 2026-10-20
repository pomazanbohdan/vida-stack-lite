---
instruction_id: maintain-plan-ledger
title: Веди журнал виконання як карту відновлення
summary: "Тримай для кожного плану окремий журнал із завершеними задачами, рішеннями й поточним раундом."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: План виконується кількома задачами або може бути перерваний.
conditions_does_not_apply_when: Робота складається з однієї короткої дії без відновлення.
artifact_contract_output_type: plan-ledger
artifact_contract_required_data:
  - ідентичність плану
  - завершені задачі
  - рішення
  - поточний раунд
artifact_contract_verified_by: ledger entries match commits and test results
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 1
---

# Веди журнал виконання як карту відновлення
Створи окремий журнал для кожного плану.
Запиши ідентичність плану в першому рядку.
Позначай кожну завершену задачу окремим рядком.
Записуй діапазон змін і результат перевірки.
Записуй поточний раунд виправлення.
Записуй кожне рішення про відхилення.
Не використовуй чужий журнал.
Не змішуй журнали різних планів.
Не покладайся лише на поточний список задач.
Відновлюй стан із журналу після втрати контексту.
Звіряй журнал з історією змін.
Прибирай журнал лише після завершення роботи.
Повідом власнику про відновлення з журналу.
Не видаляй журнал, поки триває перегляд.
Зберігай журнал разом із матеріалами плану.
