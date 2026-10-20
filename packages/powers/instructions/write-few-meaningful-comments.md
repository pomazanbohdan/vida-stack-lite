---
instruction_id: write-few-meaningful-comments
title: "Пиши мало коментарів, але доречних"
summary: "Коментуй лише причину, якої не видно з коду, і замінюй коментар назвою там, де це можливо."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: Ти додаєш або переглядаєш коментарі в коді.
conditions_does_not_apply_when: "Коментар є обов'язковим елементом зовнішнього формату."
artifact_contract_output_type: commented-code
artifact_contract_required_data:
  - причина
  - межа обходу
  - прибрані коментарі
  - перевірка актуальності
artifact_contract_verified_by: each remaining comment checked against the current code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/no-comments/SKILL.md
status: active
revision: 1
---

# Пиши мало коментарів, але доречних
Коментуй причину, якої не видно з коду.
Не переказуй у коментарі те, що робить наступний рядок.
Пояснюй неочевидне обмеження або обхід.
Познач межу, за якої обхід перестане бути потрібним.
Прибери коментар, який застарів після зміни коду.
Заміни коментар на кращу назву, якщо це можливо.
Не залишай закоментований код.
Познач коментарем лише те, що зламається без пояснення.
Перевір, чи не дублює коментар назву функції.
Не пиши коментар замість тесту.
Тримай коментар поруч із місцем, до якого він стосується.
Пиши коментар тією мовою, що й решта коду проєкту.
Перевір, чи коментар не суперечить фактичній поведінці.
Віддай код, у якому коментар додає інформацію, а не шум.
