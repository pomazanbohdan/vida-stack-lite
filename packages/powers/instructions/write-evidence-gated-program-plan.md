---
instruction_id: write-evidence-gated-program-plan
title: "Пиши план, що спирається на докази"
summary: "Кожен етап плану має перевірюваний вихід і доказ, який дозволяє перейти до наступного."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Робота охоплює кілька етапів і проміжні результати впливають на наступні.
conditions_does_not_apply_when: Робота виконується одним кроком без проміжних рішень.
artifact_contract_output_type: gated-plan
artifact_contract_required_data:
  - етапи
  - вихід етапу
  - доказ
  - залежності
  - умова зупинки
artifact_contract_verified_by: each stage gate checked before the next stage starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/multi-phase-plan.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/05-build-and-clean.md
status: active
revision: 1
---

# Пиши план, що спирається на докази
Почни з результату, який має бути досягнутий.
Розбий шлях на етапи з перевірюваним виходом.
Для кожного етапу назви доказ, який його закриває.
Познач залежності й те, що блокує початок.
Вкажи, які дані потрібні для кожного етапу.
Додай оцінку обсягу, щоб етап не ріс непомітно.
Познач етап, який можна виконати паралельно.
Запиши, хто приймає результат етапу.
Вкажи, які рішення вже ухвалені й не переглядаються.
Додай умову зупинки для кожного етапу.
Не включай етап, який не має способу перевірки.
Тримай план коротким: один екран замість документа.
Оновлюй план після кожного закритого етапу.
Віддай план із критеріями приймання й послідовністю.
