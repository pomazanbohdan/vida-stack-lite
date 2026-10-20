---
instruction_id: report-what-changed-since-last-update
title: Звітуй про зміни з попереднього оновлення
summary: "Подавай різницю станів із доказами, а не повторний переказ усієї роботи."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: "Ти оновлюєш статус роботи, яку вже показував раніше."
conditions_does_not_apply_when: Це перший звіт про роботу.
artifact_contract_output_type: progress-delta
artifact_contract_required_data:
  - завершено
  - зміни плану
  - застрягло
  - докази
  - наступне
artifact_contract_verified_by: each completed item linked to its check result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/07-overnight.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/orchestrate.md
status: active
revision: 1
---

# Звітуй про зміни з попереднього оновлення
Візьми попередній звіт як точку відліку.
Переліч, що завершено з того часу.
Назви, що змінилося в плані й чому.
Познач, що застрягло й що для цього потрібно.
Вкажи, скільки часу або кроків залишилося до завершення.
Познач, що змінилося в оцінці ризику.
Додай посилання на артефакти, а не їхній переказ.
Скажи прямо, якщо робота йде повільніше за план.
Відділяй завершене від розпочатого.
Додай докази для кожного завершеного пункту.
Не повторюй усе, що вже було в попередньому звіті.
Вкажи, що буде наступним.
Тримай звіт коротшим за перелік змін.
Віддай різницю станів, а не повний переказ роботи.
