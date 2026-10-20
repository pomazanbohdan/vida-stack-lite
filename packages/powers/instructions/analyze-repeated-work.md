---
instruction_id: analyze-repeated-work
title: Знаходь повторну роботу
summary: Групуй однакові дії й відрізняй виправдане повторення від втраченого стану.
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Скарга стосується повторних дій або витраченої роботи.
conditions_does_not_apply_when: Артефакт не містить повторюваних дій.
artifact_contract_output_type: repeated-work-report
artifact_contract_required_data:
  - групи дій
  - кількість
  - зміни між повторами
  - висновок
artifact_contract_verified_by: groups and counts derived from recorded actions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/repeated-work.md
status: active
revision: 1
---

# Знаходь повторну роботу
Витягни кожну дію з ключем: файл, команда, запит або доручення.
Згрупуй дії за ключем.
Порахуй повтори для кожної групи.
Перевір, чи змінилося щось між повторами.
Відрізняй повторне читання після зміни від повторного читання без причини.
Познач повторення після втрати контексту окремо.
Знайди повторно ухвалені рішення.
Назви перше й останнє місце групи.
Не вважай кожен повтор дефектом.
Не пропускай повторні доручення з однаковим описом.
Не об'єднуй різні команди в одну групу.
Не оцінюй намір без доказу.
Відділяй перевірку стану від повторної роботи.
Познач повторення, спричинене перезапуском.
Повідом про повторення з кількістю.
Заверши, коли кожна група повторів має кількість і причину.
