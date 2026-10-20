---
instruction_id: report-diagnosis-without-prescribing
title: "Звітуй про докази, не призначай виправлення"
summary: "Описуй, що сталося, з посиланнями й упевненістю; рішення про зміни ухвалює той, хто відповідає за продукт."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: Аналіз завершено і треба передати його результати.
conditions_does_not_apply_when: Звіт ще не має підкріплених знахідок.
artifact_contract_output_type: diagnosis-report
artifact_contract_required_data:
  - твердження
  - середовище
  - хронологія
  - знахідки
  - обмеження
artifact_contract_verified_by: every claim cites evidence and confidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/SKILL.md
status: active
revision: 2
---

# Звітуй про докази, не призначай виправлення
Почни звіт із погодженого твердження про проблему.
Опиши середовище й перевірені артефакти.
Додай хронологію значущих подій.
Подай знахідки за вимірами.
Для кожної знахідки вкажи доказ і впевненість.
Назви, що не вдалося перевірити.
Назви, які частини артефакту не прочитано.
Назви, що підвищило б упевненість у висновку.
Не називай дефект настанови чи продукту.
Не пропонуй конкретне виправлення.
Не приписуй намір виконавцю.
Не приховуй суперечливі знахідки.
Відділяй факт від інтерпретації.
Познач рівень упевненості для кожної заяви.
Залиш звіт придатним для передачі.
