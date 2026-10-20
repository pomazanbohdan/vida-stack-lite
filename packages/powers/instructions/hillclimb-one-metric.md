---
instruction_id: hillclimb-one-metric
title: Покращуй одну метрику крок за кроком
summary: "Змінюй по одній гіпотезі за раз і залишай крок лише тоді, коли метрика покращилася понад шум."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Є вимірювана метрика, яку треба покращити без зміни функціональної поведінки."
conditions_does_not_apply_when: Метрику неможливо виміряти відтворювано або ціль ще не визначена.
artifact_contract_output_type: improvement-log
artifact_contract_required_data:
  - метрика
  - база
  - кроки
  - виміри
  - відкочені спроби
artifact_contract_verified_by: the recorded measurement runs for every kept step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/hillclimb.md
status: active
revision: 1
---

# Покращуй одну метрику крок за кроком
Обери одну метрику, яка описує потрібний результат.
Зафіксуй базове значення й методику вимірювання.
Склади список гіпотез, що можуть покращити метрику.
Змінюй по одній гіпотезі за крок.
Вимірюй після кожного кроку тим самим способом.
Залишай зміну лише тоді, коли покращення перевищує шум.
Відкочуй зміну, що не дала ефекту.
Запиши, що саме змінилося й на скільки.
Перевір, що поведінка продукту не змінилася поза метрикою.
Веди список гіпотез, які ще не перевірені.
Стеж, щоб метрика не покращувалася ціною іншої важливої властивості.
Зупинись, коли подальші кроки дають менше за шум.
Не змінюй кілька речей одночасно.
Збережи відтворюваний сценарій вимірювання.
Віддай історію кроків із числами й відкоченими спробами.
