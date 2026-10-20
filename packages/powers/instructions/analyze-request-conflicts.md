---
instruction_id: analyze-request-conflicts
title: Знаходь конфлікти між дорученнями
summary: "Переліч вимоги власника й познач ті, що не можна виконати разом, та як їх розв'язано."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Скарга стосується суперечливих вимог або зміни обсягу.
conditions_does_not_apply_when: Доручення не містять суперечностей.
artifact_contract_output_type: request-conflict-report
artifact_contract_required_data:
  - вимоги
  - конфлікт
  - "розв'язання"
  - доказ
artifact_contract_verified_by: each conflict cited with both sources
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/request-conflicts.md
status: active
revision: 1
---

# Знаходь конфлікти між дорученнями
Витягни кожне доручення власника з місцем доказу.
Виділи накази, заборони, межі й умови.
Знайди дві вимоги, які не можна виконати разом.
Знайди вимогу, що суперечить чинній настанові.
Знайди доручення пропустити або обійти правило.
Запиши, що зробив виконавець після конфлікту.
Знайди уточнення, яке змінило обсяг.
Цитуй обидві сторони конфлікту.
Не оцінюй, хто правий.
Не вигадуй конфлікт із різних формулювань.
Не приховуй доручення, яке скасувало попереднє.
Відділяй конфлікт від зміни рішення.
Познач, чи конфлікт вирішено.
Не використовуй конфлікт для виправдання збою.
Повідом про конфлікт без поради.
Заверши, коли кожен конфлікт має обидві сторони й розв'язання.
