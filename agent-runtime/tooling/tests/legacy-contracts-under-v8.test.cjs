'use strict';

/* The established contract suites exercise the public CJS boundary. Loading
 * them here makes their execution visible to V8 coverage without replacing
 * their standalone Node entry points. */
const integrationTest = (process.env.STRYKER || __dirname.includes('.stryker-tmp')) ? test.skip : test;
describe('public runtime contracts under V8 coverage', () => {
  integrationTest('all standalone runtime contracts pass', () => {
    for (const file of [
      '../../../tests/agent-runtime/runtime-contract.test.cjs',
      '../../../tests/agent-runtime/schema-contract.test.cjs',
      '../../../tests/agent-runtime/runtime-adversarial-contract.test.cjs',
      '../../../tests/agent-runtime/legacy-import-contract.test.cjs'
    ]) {
      delete require.cache[require.resolve(file)];
      require(file);
    }
  }, 120000);
});
