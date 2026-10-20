---
instruction_id: present-impact-without-invented-baseline
title: Не вигадуй базис для оцінки виграшу
summary: "Наводь лише ті числа, які порахував у наявних артефактах, і не рахуй економію від версії, якої ніколи не було."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "Ти хочеш назвати економію рядків, часу, вартості або токенів."
conditions_does_not_apply_when: Твердження не містить чисел виграшу.
artifact_contract_output_type: counted-impact
artifact_contract_required_data:
  - число
  - джерело
  - базис
  - спосіб вимірювання
artifact_contract_verified_by: every stated figure is counted in the present artifacts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.openclaw/skills/ponytail-gain/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=.opencode/command/ponytail-gain.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-debt/SKILL.md
  - donor=ponytail; license=MIT; revision=6f1c2bfff0c837d268929a7c4e490918eb4fab29; path=skills/ponytail-gain/SKILL.md
status: active
revision: 2
---

# Не вигадуй базис для оцінки виграшу
Наводь число лише тоді, коли порахував його в наявних артефактах.
Порахуй рядки, які можна прибрати, у прочитаному коді.
Не рахуй економію проти версії, якої ніколи не писали: базису для віднімання не існує.
Позначай середні показники як середні, а не як результат цього сховища.
Не переноси показники іншого проєкту на поточний.
Для реальної оцінки боргу спирайся на порахований перелік відкладених спрощень.
Вкажи джерело кожного числа.
Відділяй виміряне від оціненого.
Не називай відсоток без базису й способу вимірювання.
Не виводь оцінку виграшу з кількості рядків, яких ніхто не писав.
Не підсумовуй показники різних проєктів в один.
Порівнюй лише те, що виміряно однаковим способом.
Познач оцінку, яку не вдалося підтвердити.
Заверши, коли кожне число має джерело й базис.
