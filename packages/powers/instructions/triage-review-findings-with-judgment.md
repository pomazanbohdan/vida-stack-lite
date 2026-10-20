---
instruction_id: triage-review-findings-with-judgment
title: "Вирішуй, що зі знахідок справді важливе"
summary: Перевіряй кожне зауваження на фактах і відділяй блокери від покращень та уподобань.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: "Після огляду є набір зауважень, які треба відсортувати й виконати."
conditions_does_not_apply_when: Зауваження вже перевірені й мають готовий пріоритет.
artifact_contract_output_type: finding-triage
artifact_contract_required_data:
  - усі зауваження
  - перевірка фактів
  - рівень
  - порядок дій
  - рішення власника
artifact_contract_verified_by: each kept finding checked against the code path it names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/interrogate/references/lead-judgment.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/judgment-reviewer.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/reflect/references/synthesizer.md
status: active
revision: 1
---

# Вирішуй, що зі знахідок справді важливе
Збери всі зауваження без відбору.
Перевір кожне зауваження на фактах, а не на впевненості автора.
Відкинь те, що не має конкретного сценарію шкоди.
Об'єднай дублікати в одну знахідку з кількома прикладами.
Відділи блокери від покращень і від особистих уподобань.
Оціни ціну виправлення й ризик залишити як є.
Перевір, чи знахідка стосується зміни, а не давно наявного коду.
Познач знахідки, які варто винести в окрему роботу.
Скажи прямо, якщо зауваження хибне.
Постав найризикованішу знахідку першою.
Поясни, чому інші знахідки не блокують.
Не погоджуйся із зауваженням лише через його впевнений тон.
Не відкидай зауваження через те, що воно незручне.
Запиши, які знахідки потребують рішення власника.
Віддай короткий вердикт і список дій у порядку виконання.
