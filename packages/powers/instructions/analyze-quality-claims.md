---
instruction_id: analyze-quality-claims
title: Зіставляй заяви про якість із доказами
summary: "Перевір кожну заяву готово, виправлено, проходить на наявність результату в тому самому кроці."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Скарга стосується непідтверджених заяв або фальшивого завершення.
conditions_does_not_apply_when: Артефакт не містить заяв про стан роботи.
artifact_contract_output_type: quality-evidence-report
artifact_contract_required_data:
  - заяви
  - доказ
  - прогалини
  - критерії
artifact_contract_verified_by: each claim matched to a result in the same turn
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/quality-evidence.md
status: active
revision: 2
---

# Зіставляй заяви про якість із доказами
Знайди всі запуски тестів і їхні результати.
Знайди заяви про завершення, виправлення й успіх.
Для кожної заяви знайди результат у тому самому кроці.
Познач заяви без підтвердження.
Перевір повідомлення змін проти виконаних дій.
Познач зміни, які заявляють більше, ніж зроблено.
Познач роботу, яку не збережено, хоч план цього вимагав.
Знайди зауваження перегляду й відповіді на них.
Познач зауваження без дії або причини.
Перевір критерії приймання як виконані, невиконані або неперевірені.
Не оцінюй якість коду.
Не довіряй підсумку без виводу.
Відділяй статичний аналіз від тесту.
Цитуй місце доказу.
Заверши, коли кожна заява має доказ або позначену прогалину.
