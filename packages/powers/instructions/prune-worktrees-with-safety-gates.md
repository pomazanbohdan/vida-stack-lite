---
instruction_id: prune-worktrees-with-safety-gates
title: Прибирай робочі копії з перевірками безпеки
summary: "Видаляй тимчасові копії лише після підтвердження, що їхні зміни збережені або більше не потрібні."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: "Після роботи лишилися окремі копії, гілки або теки, які треба прибрати."
conditions_does_not_apply_when: Копія ще використовується іншим виконавцем.
artifact_contract_output_type: workspace-cleanup
artifact_contract_required_data:
  - перелік копій
  - стан змін
  - рішення
  - що збережено
artifact_contract_verified_by: a clean listing of the main checkout after removal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/worktree-cleanup.md
status: active
revision: 1
---

# Прибирай робочі копії з перевірками безпеки
Переліч робочі копії й пов'яжи кожну з гілкою та задачею.
Перевір, чи є в копії незакомічені або неопубліковані зміни.
Перевір, чи гілка вже злита або більше не потрібна.
Перевір, чи не тримає копію фоновий процес або редактор.
Познач копії, які треба зберегти для відтворення дефекту.
Прибери посилання на копію з конфігурації проєкту.
Збережи потрібні зміни перед видаленням.
Зупини процеси, що тримають файли відкритими.
Видали копію лише після підтвердження, що зміни ніде не загубляться.
Прибери службові файли, які лишилися після роботи.
Перевір, що основна копія не постраждала.
Запиши, що саме видалено й чому.
Не видаляй чужу копію без згоди власника.
Віддай список видалених і збережених копій.
