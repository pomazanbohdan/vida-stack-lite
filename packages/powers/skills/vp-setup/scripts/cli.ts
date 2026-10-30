import process from 'node:process';
import { runCli } from './setup.ts';

await runCli(process.argv.slice(2));
