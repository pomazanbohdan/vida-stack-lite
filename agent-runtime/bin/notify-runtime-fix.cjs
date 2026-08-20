'use strict';

const fs = require('fs');
const path = require('path');
const { writeNotification } = require('../lib/runtime-fix-notification.cjs');

function fail(message) {
  const error = new Error(message);
  error.code = 'GAP-RUNTIME-FIX-NOTIFICATION';
  throw error;
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
}

function parse(argv) {
  const input = argument(argv, '--input');
  if (!input || input.startsWith('-')) fail('--input <notification-json> is required');
  const output = argument(argv, '--output') || 'summary';
  if (!['summary', 'full'].includes(output)) fail('notification output mode invalid');
  return { input, output, outputRoot: argument(argv, '--output-root') };
}

function readInput(root, relative) {
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) fail('notification input unavailable');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail('notification input is not valid JSON'); }
}

function run(argv = process.argv.slice(2)) {
  try {
    const root = path.resolve(process.cwd());
    const options = parse(argv);
    const result = writeNotification(root, readInput(root, options.input), { outputRoot: options.outputRoot });
    const summary = {
      schema: result.notification.schema,
      notification_id: result.notification.notification_id,
      status: result.notification.delivery.status,
      gap_code: result.notification.delivery.gap_code,
      recipients: result.notification.recipients,
      path: result.path,
      already_current: result.already_current,
      next_action: result.notification.next_action
    };
    process.stdout.write(`${JSON.stringify(options.output === 'full' ? result.notification : summary)}\n`);
    return result;
  } catch (error) {
    process.stderr.write(`${error.code || 'ERROR'}: ${error.message}\n`);
    process.exitCode = 2;
    return null;
  }
}

if (require.main === module) run();

module.exports = { parse, readInput, run };
