---
instruction_id: wait-boundedly-for-workers
title: Чекай на виконавців обмеженими проміжками
summary: "Не опитуй виконавця без кінця й не чекай мовчки: працюй локально, а потім звіряй стан."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "Виконавець працює асинхронно, а результат потрібен для наступного кроку."
conditions_does_not_apply_when: Результат уже отриманий або робота не делегується.
artifact_contract_output_type: bounded-wait
artifact_contract_required_data:
  - локальна робота
  - проміжки очікування
  - стан виконавців
artifact_contract_verified_by: no silent or unbounded wait
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 1
---

# Чекай на виконавців обмеженими проміжками
Визнач, чи є локальна робота на час очікування.
Виконуй локальну роботу, поки виконавець працює.
Не опитуй стан короткими інтервалами.
Не чекай мовчки без межі.
Чекай обмеженими проміжками.
Між проміжками звіряй список активних виконавців.
Перевіряй, чи хтось завершив без звіту.
Повідом один рядок стану після проміжку.
Не вважай відсутність звіту завершенням.
Не закривай задачу без результату.
Не запускай дубль задачі, яка ще виконується.
Зупини очікування, якщо виконавець втрачений.
Повідом про втраченого виконавця.
Онови журнал після отримання результату.
Не витрачай очікування на порожні опитування.
