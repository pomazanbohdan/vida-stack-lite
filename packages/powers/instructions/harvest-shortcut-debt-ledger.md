---
instruction_id: harvest-shortcut-debt-ledger
title: Збирай відкладені спрощення в один перелік боргу
summary: Знайди позначки спрощень у коментарях і зведи їх у перелік із межею та умовою перегляду.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: "Потрібно побачити, які спрощення відкладені й чи мають вони умову перегляду."
conditions_does_not_apply_when: Сховище не містить позначок спрощень.
artifact_contract_output_type: shortcut-debt-ledger
artifact_contract_required_data:
  - файл і рядок
  - що спрощено
  - межа
  - умова перегляду
  - кількість без умови
artifact_contract_verified_by: every marker appears once with a ceiling and an upgrade trigger
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-debt.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
status: active
revision: 2
---

# Збирай відкладені спрощення в один перелік боргу
Шукай позначки в коментарях за префіксами коментарів твоєї мови.
Пропускай службові каталоги, залежності, збірку й кеші.
Якщо власник назвав власне слово-позначку, шукай його.
Відкидай збіги, які не є відкладенням, наприклад згадку про комбінацію клавіш.
Зроби один рядок на кожну позначку.
Згрупуй рядки за файлом.
Для кожного рядка вкажи місце, що саме спрощено, названу межу й умову перегляду.
Познач рядки без умови перегляду окремо: саме вони тихо старіють.
Наприкінці назви кількість позначок і кількість без умови перегляду.
Якщо позначок немає, скажи, що борг відсутній.
Не вигадуй межу, якої коментар не називає.
Не змінюй код під час збирання переліку.
Збережи перелік у файл лише на явний запит.
Заверши, коли кожна позначка має рядок або пояснення, чому її пропущено.
