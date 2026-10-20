---
instruction_id: analyze-cost-and-time
title: Рахуй витрати й час за записами
summary: "Визнач, куди пішли токени й час, за фактичними записами, не здогадуючись про причини."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: "Скарга стосується тривалості, вартості або надмірних витрат."
conditions_does_not_apply_when: Артефакт не містить записів про витрати або час.
artifact_contract_output_type: cost-and-time-report
artifact_contract_required_data:
  - підсумки
  - найбільші кроки
  - найдовші проміжки
  - непідтверджені поля
artifact_contract_verified_by: totals computed from recorded counters
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/cost-and-time.md
status: active
revision: 1
---

# Рахуй витрати й час за записами
Встанови, які показники є накопичувальними, а які приростними.
Порахуй підтверджені підсумки.
Назви кроки з найбільшими витратами.
Назви найдовші проміжки часу.
Порахуй найбільші результати інструментів.
Порахуй перезапуски контексту.
Порахуй пов'язані дочірні виконання.
Назви, що домінує у витратах, із числами.
Не перетворюй відсутній показник на нуль.
Не вигадуй причину витрат поза записами.
Не порівнюй непорівнювані одиниці.
Не роби висновок про якість із ціни.
Відділяй очікування від фактичного часу.
Познач, які поля непідтверджені.
Повідом про неповноту даних.
Заверши, коли підсумки й непідтверджені поля названі.
