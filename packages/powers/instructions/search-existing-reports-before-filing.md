---
instruction_id: search-existing-reports-before-filing
title: Шукай наявні звіти перед поданням нового
summary: "Перед новим звітом перевір, чи вже описано той самий симптом, і покажи власнику найближчий випадок."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Треба подати звіт про помилку або неочікувану поведінку.
conditions_does_not_apply_when: "Звіт уже прив'язаний до наявного випадку."
artifact_contract_output_type: report-search
artifact_contract_required_data:
  - симптом
  - пошукові терміни
  - найближчий звіт
  - рішення
artifact_contract_verified_by: search performed before filing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/references/github-issues.md
status: active
revision: 1
---

# Шукай наявні звіти перед поданням нового
Визнач симптом, який треба описати.
Сформулюй пошукові терміни з ключових слів симптому.
Пошукай відкриті й закриті звіти.
Переглянь найближчі за темою результати.
Порівняй їхній симптом із твоїм.
Якщо збіг є, покажи його власнику.
Запропонуй додати доказ до наявного звіту.
Не створюй дубль без перевірки.
Якщо збігу немає, підготуй новий звіт.
Додай відтворюваний випадок.
Додай середовище й уражені версії.
Покажи точний текст звіту до подання.
Дочекайся згоди на подання.
Запиши пошукові терміни й найближчий звіт.
