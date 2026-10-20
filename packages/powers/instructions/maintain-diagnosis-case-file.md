---
instruction_id: maintain-diagnosis-case-file
title: Веди робочий файл діагностики
summary: "Фіксуй джерела, значення полів, підтвердження тотожності, відкинутих кандидатів і невирішені питання."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Аналіз охоплює кілька артефактів або читачів.
conditions_does_not_apply_when: Аналіз складається з одного короткого читання.
artifact_contract_output_type: diagnosis-case-file
artifact_contract_required_data:
  - джерела
  - значення полів
  - кандидати
  - невирішені питання
artifact_contract_verified_by: case file lets another reader repeat the analysis
compatibility_excludes: []
compatibility_requires:
  - locate-verified-artifact
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/case.md
status: active
revision: 3
---

# Веди робочий файл діагностики
Створи окремий файл для кожного діагностичного випадку.
Запиши питання й межі діагностики.
Переліч джерела з абсолютними шляхами.
Запиши спосіб витягування кожного поля.
Підтвердь тотожність джерел.
Переліч відкинуті кандидати з причиною.
Познач значення полів і їхнє походження.
Відрізняй історичні, поточні й непідтверджені дані.
Запиши пов'язані джерела.
Запиши невирішені питання.
Правила читання полів артефакту бери з locate-verified-artifact.
Оновлюй файл під час діагностики.
Збережи файл разом зі звітом.
Заверши, коли інший читач може повторити діагностику за файлом.
