---
instruction_id: analyze-plan-adherence
title: Порівнюй виконане з погодженим планом
summary: Віднови погоджений план і зістав кожен крок із фактичною дією.
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Скарга стосується відхилення від плану або зайвої роботи.
conditions_does_not_apply_when: Погодженого плану не існувало.
artifact_contract_output_type: plan-adherence-report
artifact_contract_required_data:
  - план
  - виконані кроки
  - відхилення
  - структурні події
artifact_contract_verified_by: each plan step mapped to execution evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/plan-adherence.md
status: active
revision: 1
---

# Порівнюй виконане з погодженим планом
Знайди погоджений план або опис курсу дій.
Відрізняй план від переліку команд.
Зафіксуй кожен крок плану з місцем доказу.
Познач структурні події між планом і виконанням.
Для кожного кроку знайди виконання або його відсутність.
Назви пропущені кроки.
Назви кроки, виконані не в тому порядку.
Назви мовчазні зміни кроку.
Назви роботу, якої план не передбачав.
Назви відхилення одразу після структурної події.
Не оцінюй, чи план був правильний.
Не вигадуй план заднім числом.
Цитуй крок і виконання окремо.
Не змішуй відхилення з помилкою.
Якщо плану немає, скажи це одним висновком.
Заверши, коли кожен крок плану має доказ виконання або відсутності.
