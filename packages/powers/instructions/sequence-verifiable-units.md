---
instruction_id: sequence-verifiable-units
title: Діли роботу на перевірювані одиниці
summary: Розбий задачу на завершені одиниці з власною перевіркою й не переходь далі до зеленої попередньої.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Задача більша за одну перевірювану зміну.
conditions_does_not_apply_when: Задача вкладається в одну зміну з однією перевіркою.
artifact_contract_output_type: unit-sequence
artifact_contract_required_data:
  - одиниці
  - результат одиниці
  - перевірка
  - залежності
artifact_contract_verified_by: each unit checked before the next one starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-sequence-verifiable-units/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/feature.md
status: active
revision: 1
---

# Діли роботу на перевірювані одиниці
Розбий задачу на одиниці, кожна з яких дає спостережуваний результат.
Зроби одиницю завершеною сама по собі.
Перевір кожну одиницю перед переходом до наступної.
Тримай одиницю достатньо малою для одного огляду.
Познач одиниці, які залежать від інших.
Обери порядок, у якому кожна одиниця залишає систему робочою.
Відклади одиницю, яку не можна перевірити окремо.
Запиши, які одиниці можна виконати паралельно.
Онови послідовність, якщо одиниця виявилася залежною від наступної.
Не змішуй у одній одиниці рефакторинг і нову поведінку.
Додай для кожної одиниці спосіб перевірки.
Запиши, що одиниця не робить.
Оновлюй план, якщо одиниця виявилася більшою за очікувану.
Віддай послідовність одиниць із критеріями готовності.
