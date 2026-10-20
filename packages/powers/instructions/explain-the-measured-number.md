---
instruction_id: explain-the-measured-number
title: Поясни виміряне число
summary: "Подавай метрику разом із базою, умовами й розкидом, щоб число можна було інтерпретувати."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Ти наводиш вимірювання швидкодії, обсягу або іншого кількісного показника."
conditions_does_not_apply_when: Число не використовується для рішення й потрібне лише як довідка.
artifact_contract_output_type: measurement-report
artifact_contract_required_data:
  - метрика й одиниця
  - базове значення
  - умови
  - розкид
  - складові
artifact_contract_verified_by: repeated runs of the recorded measurement command
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/benchmark-checklist/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/perf-issue.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-explain-the-number/SKILL.md
status: active
revision: 1
---

# Поясни виміряне число
Назви метрику, її одиницю й точку вимірювання.
Запиши базове значення до будь-якої зміни.
Вкажи умови вимірювання: дані, обладнання, прогрів.
Повтори вимірювання кілька разів і подай розкид.
Відрізняй зміну в межах шуму від справжнього зсуву.
Поясни, з яких складових складається число.
Покажи, яка складова домінує.
Порівняй число з попереднім виміром того самого сценарію.
Познач, які умови неможливо відтворити.
Скажи, чи число достатнє для рішення, яке ти пропонуєш.
Перевір, чи метрика реагує на зміну, яку ти контролюєш.
Не порівнюй числа, виміряні в різних умовах.
Зафіксуй команду, якою отримано число.
Назви припущення, від яких залежить інтерпретація.
Віддай число разом із базою, розкидом і поясненням.
