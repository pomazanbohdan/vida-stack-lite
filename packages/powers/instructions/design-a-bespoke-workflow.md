---
instruction_id: design-a-bespoke-workflow
title: Проєктуй робочий процес під конкретний проєкт
summary: "Будуй процес із реальних команд і меж проєкту, а не з універсальних порад."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: Треба налаштувати повторювану роботу під конкретний проєкт із його командами й правилами.
conditions_does_not_apply_when: Процес уже описаний і працює без ручних поправок.
artifact_contract_output_type: project-workflow
artifact_contract_required_data:
  - команди проєкту
  - кроки
  - режим перевірки
  - припущення
artifact_contract_verified_by: the workflow run on a clean copy of the project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/setup-benny/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/09-make-it-yours.md
status: active
revision: 1
---

# Проєктуй робочий процес під конкретний проєкт
З'ясуй, як у проєкті запускають, перевіряють і публікують зміни.
Запиши реальні команди й шляхи, а не загальні поради.
Визнач, які кроки проєкт уже автоматизує.
Додай лише те, чого бракує для повторюваної роботи.
Зроби процес незалежним від конкретного агента чи хоста.
Опиши, як процес дізнається про невдачу.
Додай перевірку, що середовище має потрібні інструменти.
Опиши, що робити, коли команда проєкту змінилася.
Збережи приклад успішного запуску як еталон.
Прибери кроки, які проєкт виконує сам.
Передбач режим перевірки без змін.
Перевір процес на чистій копії проєкту.
Запиши, які припущення про проєкт треба перевірити під час запуску.
Віддай процес, який працює в цьому проєкті без ручних поправок.
