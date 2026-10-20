---
instruction_id: format-diagnosis-report
title: Подавай діагностичний звіт у фіксованій структурі
summary: "Звіт має містити проблему, висновок, середовище, переглянуті артефакти, хронологію, знахідки за вимірами, обмеження й покриття."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Треба оформити результати діагностики для передачі.
conditions_does_not_apply_when: Аналіз ще не має підкріплених знахідок.
artifact_contract_output_type: structured-diagnosis-report
artifact_contract_required_data:
  - проблема
  - висновок
  - середовище
  - артефакти
  - хронологія
  - знахідки
  - покриття
artifact_contract_verified_by: all required sections present in order
compatibility_excludes: []
compatibility_requires:
  - cite-evidence-lines
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/templates/report.md
status: active
revision: 3
---

# Подавай діагностичний звіт у фіксованій структурі
Визнач питання, на яке має відповісти звіт.
Почни з відповіді та рівня впевненості.
Опиши умови, у яких збирали докази.
Переліч переглянуті джерела й відкинуті варіанти.
Подай хронологію значущих подій.
Подай знахідки за кожним аспектом окремо.
Для кожної знахідки вкажи місце, цитату й упевненість.
Познач аспект без знахідок як перевірений.
Назви обмеження й непрочитані частини.
Познач, чи проблема ще триває.
Не додавай розділ із виправленнями.
Відділяй доказ від припущення за cite-evidence-lines.
Збережи однаковий порядок розділів.
Познач непідтверджені твердження.
Заверши, коли кожен обов'язковий розділ має доказ або позначене обмеження.
