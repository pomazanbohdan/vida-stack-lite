---
instruction_id: require-concrete-failure-case
title: Вимагай конкретний випадок для кожної знахідки
summary: Знахідка без вхідних даних і неправильного результату не потрапляє у звіт.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Ти збираєшся назвати знахідку.
conditions_does_not_apply_when: Ти лише описуєш метод перевірки.
artifact_contract_output_type: verified-finding
artifact_contract_required_data:
  - випадок
  - місце в коді
  - підтвердження
  - відкинуті знахідки
artifact_contract_verified_by: no finding is reported without a concrete failure case
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-review/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-audit.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-review.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-audit/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-review/SKILL.md
status: active
revision: 2
---

# Вимагай конкретний випадок для кожної знахідки
Сформулюй випадок: які вхідні дані або ситуація дають неправильний результат.
Перечитай рядки й підтвердь, що виклик існує.
Підтвердь, що значення справді може бути порожнім.
Підтвердь, що код справді не використовується, перш ніж назвати його мертвим.
Відкинь знахідку, для якої не можеш назвати випадок.
Не перетворюй стиль на знахідку.
Не пиши «варто розглянути» без названого наслідку.
Не пиши загальних побоювань без місця й умови.
Познач знахідку, яку не вдалося підтвердити, як непідтверджену.
Підтвердь, що випадок відтворюється саме в цих рядках.
Відкидай знахідку про код, якого не читав.
Назви, які частини перевірив, а які ні.
Не додавай знахідку, яку не можеш підкріпити місцем у коді.
Заверши, коли кожна знахідка має випадок або відкинута.
