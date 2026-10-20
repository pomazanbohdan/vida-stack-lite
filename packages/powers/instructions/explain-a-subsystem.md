---
instruction_id: explain-a-subsystem
title: Пояснюй підсистему від мети до деталей
summary: "Пояснюй підсистему через її задачу, межу й основний шлях, а не через переказ рядків коду."
capability_tags:
  - explain-subsystem
pattern_tags:
  - subsystem-explanation
conditions_applies_when: "Треба пояснити, як працює частина системи, людині, яка її не знає."
conditions_does_not_apply_when: Потрібен точковий опис одного рядка або виправлення дефекту.
artifact_contract_output_type: subsystem-explanation
artifact_contract_required_data:
  - мета
  - межа
  - основний шлях
  - структури даних
  - приклад
artifact_contract_verified_by: a newcomer locating the right place after reading the explanation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/how/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/how/references/explainer-prompt.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/bro/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/teach/SKILL.md
status: active
revision: 1
---

# Пояснюй підсистему від мети до деталей
Почни з того, яку задачу вирішує підсистема.
Назви її межу: що входить, що виходить, хто викликає.
Опиши основний шлях виконання крок за кроком.
Покажи, де зберігається стан і хто ним володіє.
Назви дві-три найважливіші структури даних.
Поясни, чому підсистема поділена саме так.
Покажи місце, де найчастіше виникають помилки.
Додай приклад реального виклику.
Познач, що можна змінити без впливу на сусідів.
Назви, які частини підсистеми залежать від зовнішнього сервісу.
Не переказуй код рядок за рядком.
Зупинись, коли читач може самостійно знайти потрібне місце.
Перевір пояснення на людині, яка вперше бачить підсистему.
Віддай пояснення зі схемою шляху й прикладом.
