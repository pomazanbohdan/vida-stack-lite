---
instruction_id: review-task-both-verdicts
title: Перевіряй задачу за вимогами і якістю
summary: "Вимагай від перегляду двох окремих висновків: відповідність вимогам і якість виконання."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Задачу виконано і її треба прийняти або повернути на виправлення.
conditions_does_not_apply_when: Задача ще не має завершеного дифу або звіту.
artifact_contract_output_type: task-review
artifact_contract_required_data:
  - межі дифу
  - висновок про вимоги
  - висновок про якість
artifact_contract_verified_by: two independent verdicts recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/task-reviewer-prompt.md
status: active
revision: 2
---

# Перевіряй задачу за вимогами і якістю
Передай рецензенту бриф, звіт і повний диф зміни.
Вкажи базову ревізію й голову діапазону.
Дай глобальні обмеження як фокус перегляду.
Вимагай висновок про відповідність вимогам.
Вимагай окремий висновок про якість задачі.
Не приймай звіт лише з одним висновком.
Не замінюй перегляд самоперевіркою виконавця.
Не пропускай перегляд задачі через простоту.
Не передавай рецензенту всю історію сесії.
Не кажи рецензенту, що не вважати дефектом.
Не проси повторно запускати тести без конкретного сумніву.
Познач вимоги, які неможливо підтвердити з самого дифа.
Вважай підтверджену прогалину провалом перегляду вимог.
Не переходь до наступної задачі з відкритим блокером.
Запиши обидва висновки.
