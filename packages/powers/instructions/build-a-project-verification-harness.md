---
instruction_id: build-a-project-verification-harness
title: Побудуй перевірку проєкту
summary: "Збери сценарії, які доводять спостережувану поведінку продукту, в одну відтворювану команду."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: "Проєкт не має єдиного способу перевірити, що основні сценарії справді працюють."
conditions_does_not_apply_when: "У проєкті вже є перевірка, яка покриває потрібні сценарії й підтримується."
artifact_contract_output_type: verification-harness
artifact_contract_required_data:
  - сценарії
  - команда запуску
  - форма результату
  - покриття й прогалини
artifact_contract_verified_by: the harness runs from a clean checkout and fails on a known break
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/references/feature-map-example/README.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/references/feature-map-example/create-note.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/create-verification-skill/references/feature-map-example/search.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/06-verify-and-ship.md
status: active
revision: 1
---

# Побудуй перевірку проєкту
Визнач, який результат роботи вважається правильним для користувача.
Опиши три-п'ять сценаріїв, які покривають основні шляхи.
Для кожного сценарію вкажи вхід, дію й очікуваний спостережуваний ефект.
Побудуй запуск, який виконує сценарії однією командою.
Зроби результат машинно читаним: код виходу й короткий підсумок.
Збережи артефакти, потрібні для розбору невдачі.
Перевір, що перевірка працює на чистому середовищі.
Переконайся, що вона падає, коли поведінка зламана.
Додай перевірку межових даних: порожньо, забагато, некоректно.
Тримай сценарії незалежними один від одного.
Не покладайся на ручні кроки, які не записані.
Задокументуй, як додати новий сценарій.
Зафіксуй, які шляхи ще не покриті.
Запусти перевірку перед кожним твердженням про готовність.
Віддай команду запуску й перелік покритих сценаріїв.
