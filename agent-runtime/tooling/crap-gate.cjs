'use strict';
/* Deterministic CRAP gate for the portable runtime. It maps Espree function
 * locations to Istanbul/V8 function coverage by source range. */
const fs = require('fs');
const path = require('path');
const espree = require('espree');

const root = path.resolve(__dirname, '..');
const coverageFile = path.join(root, 'coverage', 'coverage-final.json');
const targets = [path.join(root, 'lib', 'runtime.cjs'), path.join(root, 'lib', 'backlog-adapter.cjs'), path.join(root, 'lib', 'legacy-import.cjs')];
function die(message) { process.stderr.write(`CRAP gate: ${message}\n`); process.exitCode = 1; }
function walk(node, visit) { if (!node || typeof node.type !== 'string') return; visit(node); for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach(child => walk(child, visit)); else if (value && typeof value.type === 'string') walk(value, visit); } }
const functionNodes = new Set(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression']);
function complexity(node) { let value = 1; const rootNode = node.body || node; function visit(child, root=false) { if (!child || typeof child.type !== 'string' || (!root && functionNodes.has(child.type))) return; if (['IfStatement','ForStatement','ForInStatement','ForOfStatement','WhileStatement','DoWhileStatement','CatchClause','ConditionalExpression'].includes(child.type)) value++; if (child.type === 'LogicalExpression' && ['&&','||','??'].includes(child.operator)) value++; if (child.type === 'SwitchCase' && child.test) value++; for (const item of Object.values(child)) { if (Array.isArray(item)) item.forEach(next => visit(next)); else if (item && typeof item.type === 'string') visit(item); } } visit(rootNode,true); return value; }
function functions(source, filename) { const ast = espree.parse(source, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true }); const out = [], slots = new Map(); walk(ast, node => { if (!['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)) return; const line = node.loc.start.line, slot = slots.get(line) || 0; slots.set(line, slot + 1); const name = node.id?.name || `<anonymous@${line}>`; out.push({ name, line, slot, complexity: complexity(node), filename }); }); return out; }
function hitFor(fn, fileCoverage) { const matching = Object.entries(fileCoverage.fnMap || {}).filter(([, meta]) => (meta.decl || meta.loc).start.line === fn.line); const item = matching[fn.slot]; if (!item) return { hit: 0, mapped: false }; return { hit: Number(fileCoverage.f[item[0]] || 0), mapped: true }; }
if (!fs.existsSync(coverageFile)) die(`missing ${path.relative(root, coverageFile)}; run npm run coverage first`);
else {
  const report = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  const rows = [];
  for (const target of targets) {
    const fileCoverage = report[target];
    if (!fileCoverage) { die(`coverage missing target ${target}`); continue; }
    for (const fn of functions(fs.readFileSync(target, 'utf8'), target)) {
      const observed = hitFor(fn, fileCoverage);
      const coverage = observed.hit > 0 ? 1 : 0;
      const crap = fn.complexity ** 2 * (1 - coverage) ** 3 + fn.complexity;
      rows.push({ file: path.relative(root, target), name: fn.name, line: fn.line, complexity: fn.complexity, covered: observed.hit > 0, mapped: observed.mapped, crap });
    }
  }
  const reportPath = path.join(root, 'coverage', 'crap-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify({ formula: 'complexity^2 * (1-coverage)^3 + complexity', limits: { blocking: 4, relation: '< 5', complexity_absolute: 10 }, functions: rows }, null, 2)}\n`);
  const failed = rows.filter(row => !row.mapped || row.crap >= 5 || row.complexity > 10);
  if (failed.length) die(`${failed.length} function(s) are unmapped or exceed CRAP/complexity limits; see coverage/crap-report.json`);
  else process.stdout.write(`CRAP gate: pass (${rows.length} functions; max ${Math.max(...rows.map(row => row.crap))})\n`);
}
