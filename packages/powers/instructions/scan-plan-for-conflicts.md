---
instruction_id: scan-plan-for-conflicts
title: Перевір план на конфлікти до першої задачі
summary: "Зістав задачі, їхні файли й інтерфейси та запиши кожен конфлікт до початку виконання."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: План містить кілька задач зі спільними файлами або інтерфейсами.
conditions_does_not_apply_when: План складається з однієї задачі без спільних меж.
artifact_contract_output_type: plan-conflict-scan
artifact_contract_required_data:
  - задачі
  - спільні файли
  - інтерфейси
  - рішення
artifact_contract_verified_by: one row per shared interface and per task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 2
---

# Перевір план на конфлікти до першої задачі
Прочитай план і глобальні обмеження.
Переліч задачі та їхні файли.
Знайди задачі, які змінюють той самий файл.
Знайди задачі, які споживають результат іншої.
Порівняй виробника й споживача за назвами та типами.
Перевір кожну задачу на внутрішню суперечність.
Запиши рядок для кожної спільної межі.
Запиши, які задачі й межі перевірено.
Ухвали рішення щодо кожного конфлікту.
Запиши рішення в журнал.
Не починай першу задачу до сканування.
Не вважай порожній скан доказом без рядків.
Не виправляй план мовчки.
Передай знайдені конфлікти власнику.
Онови скан, якщо план змінився.
