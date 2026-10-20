---
instruction_id: escalate-blocked-work
title: "Зупиняйся й повідомляй, коли задача перевищує можливості"
summary: "Краще зупинитися з точним описом блокування, ніж видати непевну роботу."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "Задача потребує рішення, контексту або здатності, яких не надано."
conditions_does_not_apply_when: Задача виконується в межах наданого контексту й повноважень.
artifact_contract_output_type: blocker-report
artifact_contract_required_data:
  - причина блокування
  - спроби
  - потрібна допомога
artifact_contract_verified_by: blocker report names the missing input
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/implementer-prompt.md
status: active
revision: 1
---

# Зупиняйся й повідомляй, коли задача перевищує можливості
Визнач, що саме не вдається зробити.
Перевір, чи бракує контексту, здатності чи часу.
Зупини роботу, якщо рішення потребує архітектурного вибору.
Зупини роботу, якщо потрібен код поза наданим контекстом.
Зупини роботу, якщо план не передбачає потрібної зміни.
Опиши, що вже спробував.
Опиши, що саме потрібно для продовження.
Повідом стан блокування або браку контексту.
Не видавай непевну роботу за завершену.
Не продовжуй навмання.
Не змінюй задачу без погодження.
Не приховуй, що задача виявилася завеликою.
Не передавай задачу далі без дозволу.
Запиши блокування в звіт.
Повернися до роботи після отримання відповіді.
