---
instruction_id: inspect-edge-case-classes
title: Перевіряй відомі класи межових випадків
summary: "Шукай порожнє значення, нуль, останній елемент, округлення, часові зони й неузгодженість між викликом і результатом."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "Код приймає дані, рахує, сортує або перетворює значення."
conditions_does_not_apply_when: Код не обробляє даних і не ухвалює рішень за значеннями.
artifact_contract_output_type: edge-case-findings
artifact_contract_required_data:
  - клас випадку
  - вхідні дані
  - неправильний результат
artifact_contract_verified_by: each edge-case finding names a concrete input
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

# Перевіряй відомі класи межових випадків
Перевір порожнє значення.
Перевір нуль і від'ємне число.
Перевір список з одним елементом і останній елемент.
Перевір межу діапазону й значення одразу за нею.
Перевір округлення й точність дробових чисел.
Перевір часові зони й межу доби.
Перевір, що час береться з одного джерела в одній зоні.
Перевір, чи кожен виклик згоден з тим, що функція повертає.
Знайди правило, яке в двох місцях застосовано по-різному.
Для кожного випадку назви вхідні дані й неправильний результат.
Перевіряй клас випадків, а не окремий рядок коду.
Не вважай типовий шлях доказом правильності на межі.
Познач клас, який не вдалося перевірити.
Заверши, коли кожен клас перевірено або обґрунтовано пропущено.
