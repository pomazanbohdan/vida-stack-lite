import { canonicalJson, freezeJsonValue } from '../contracts/public-ingress.js';

export interface PolicyRuleResult {
  readonly ruleId: string;
  readonly contractType: string;
  readonly passed: boolean;
  readonly message: string | null;
  readonly tags: readonly string[];
  readonly observed: boolean;
  readonly effect: string;
  readonly policyError: boolean;
}

export interface EvaluationResult {
  readonly decision: string;
  readonly toolName: string;
  readonly rules: readonly PolicyRuleResult[];
  readonly denyReasons: readonly string[];
  readonly warnReasons: readonly string[];
  readonly contractsEvaluated: number;
  readonly policyError: boolean;
  readonly workflowSkipped: boolean;
  readonly workflowReason: string | null;
}

export interface OperationPolicy {
  readonly policyVersion: string;
  readonly maxAttempts: number;
  readonly maxToolCalls: number;
  readonly maxCallsPerTool: Readonly<Record<string, number>>;
  readonly tools: Readonly<Record<string, { readonly side_effect: 'read' | 'write'; readonly idempotent: boolean }>>;
}

/** Counters belong to this policy session. HostState owns durable operation custody. */
export class PolicySession {
  readonly sessionId: string;
  readonly #values = new Map<string, string>();
  #attempts = 0;
  #executions = 0;
  #failures = 0;
  readonly #tools = new Map<string, number>();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
  async getValue(name: string): Promise<string | null> {
    return this.#values.get(name) ?? null;
  }
  async setValue(name: string, value: string): Promise<void> {
    this.#values.set(name, value);
  }
  async deleteValue(name: string): Promise<void> {
    this.#values.delete(name);
  }
  async incrementAttempts(): Promise<number> {
    return ++this.#attempts;
  }
  async attemptCount(): Promise<number> {
    return this.#attempts;
  }
  async executionCount(): Promise<number> {
    return this.#executions;
  }
  async toolExecutionCount(tool: string): Promise<number> {
    return this.#tools.get(tool) ?? 0;
  }
  async consecutiveFailures(): Promise<number> {
    return this.#failures;
  }
  async recordExecution(tool: string, success: boolean): Promise<void> {
    this.#executions += 1;
    this.#tools.set(tool, (this.#tools.get(tool) ?? 0) + 1);
    this.#failures = success ? 0 : this.#failures + 1;
  }
  async batchGetCounters(options?: { readonly includeTool?: string }): Promise<Record<string, number>> {
    return {
      attempts: this.#attempts,
      execs: this.#executions,
      consec_fail: this.#failures,
      ...(options?.includeTool === undefined
        ? {}
        : { ['tool:' + options.includeTool]: this.#tools.get(options.includeTool) ?? 0 }),
    };
  }
}

export class GovernanceDenied extends Error {
  constructor(
    readonly reason: string,
    readonly decisionSource: string | null = null,
    readonly decisionName: string | null = null,
    options?: ErrorOptions,
  ) {
    super(reason, options);
    this.name = 'EdictumDenied';
  }
}

export class GovernanceToolError extends Error {
  constructor(result: unknown) {
    super(String(result));
    this.name = 'EdictumToolError';
  }
}

function isErrorResult(result: unknown): boolean {
  if (result !== null && typeof result === 'object' && !Array.isArray(result))
    return Boolean((result as Record<string, unknown>).is_error);
  return typeof result === 'string' && /^(error:|fatal:)/i.test(result);
}

function toolName(value: string): void {
  if (typeof value !== 'string' || !value || /[\p{Cc}\u2028\u2029/\\]/u.test(value))
    throw new Error('governance tool name is invalid');
}

/** Only the configured VIDA precondition, result contract and counters; no rule interpreter. */
export class OperationPolicyGuard {
  readonly #session = new PolicySession(crypto.randomUUID());
  readonly #policy: OperationPolicy;
  readonly #validateWrite: (args: Readonly<Record<string, unknown>>) => void;
  #queue: Promise<void> = Promise.resolve();
  #inFlight = 0;
  readonly #runningTools = new Map<string, number>();

  constructor(policy: OperationPolicy, validateWrite: (args: Readonly<Record<string, unknown>>) => void) {
    this.#policy = freezeJsonValue(JSON.parse(canonicalJson(policy))) as OperationPolicy;
    this.#validateWrite = validateWrite;
  }

  async evaluate(tool: string, args: Record<string, unknown>): Promise<EvaluationResult> {
    toolName(tool);
    const rules: PolicyRuleResult[] = [];
    const denyReasons: string[] = [];
    if (!Object.hasOwn(this.#policy.tools, tool)) denyReasons.push('tool is not configured: ' + tool);
    if (tool === 'runtime.write') {
      let message: string | null = null;
      try {
        this.#validateWrite(args);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      rules.push(
        Object.freeze({
          ruleId: 'anonymous',
          contractType: 'precondition',
          passed: message === null,
          message,
          tags: Object.freeze([]),
          observed: false,
          effect: 'warn',
          policyError: false,
        }),
      );
      if (message !== null) denyReasons.push(message);
    }
    return Object.freeze({
      decision: denyReasons.length ? 'deny' : 'allow',
      toolName: tool,
      rules: Object.freeze(rules),
      denyReasons: Object.freeze(denyReasons),
      warnReasons: Object.freeze([]),
      contractsEvaluated: rules.length,
      policyError: false,
      workflowSkipped: false,
      workflowReason: null,
    });
  }

  run(
    tool: string,
    args: Record<string, unknown>,
    execute: (args: Record<string, unknown>) => unknown,
  ): Promise<unknown> {
    toolName(tool);
    const snapshot = freezeJsonValue(JSON.parse(canonicalJson(args))) as Record<string, unknown>;
    // Serialize admission, not the effect. Reserve capacity before releasing the queue.
    const admitted = this.#enqueueAdmission(() => this.#admit(tool, snapshot));
    return admitted.then(async () => {
      let succeeded = false;
      try {
        const raw = await execute(snapshot);
        const output: unknown = freezeJsonValue(JSON.parse(canonicalJson(raw)));
        if (isErrorResult(output)) throw new GovernanceToolError(output);
        succeeded = true;
        return output;
      } finally {
        this.#inFlight -= 1;
        this.#runningTools.set(tool, this.#runningTools.get(tool)! - 1);
        // Postcondition failure follows an effect; it is not pre-effect denial.
        await this.#session.recordExecution(tool, succeeded);
      }
    });
  }

  /** Preparation denial consumes one attempt, without invoking policy or tool effects. */
  rejectPreparation(error: GovernanceDenied): Promise<never> {
    return this.#enqueueAdmission(async () => {
      await this.#recordAttempt(error);
      throw error;
    });
  }

  #enqueueAdmission<T>(action: () => Promise<T>): Promise<T> {
    const admitted = this.#queue.then(action);
    this.#queue = admitted.then(
      () => undefined,
      () => undefined,
    );
    return admitted;
  }

  async #recordAttempt(cause?: GovernanceDenied): Promise<void> {
    if ((await this.#session.incrementAttempts()) >= this.#policy.maxAttempts)
      throw new GovernanceDenied('governed write attempt limit reached', 'attempt_limit', 'max_attempts', { cause });
  }

  async #admit(tool: string, args: Record<string, unknown>): Promise<void> {
    await this.#recordAttempt();
    const evaluation = await this.evaluate(tool, args);
    if (evaluation.decision !== 'allow')
      throw new GovernanceDenied(evaluation.denyReasons.join('; '), 'precondition', 'anonymous');
    if ((await this.#session.executionCount()) + this.#inFlight >= this.#policy.maxToolCalls)
      throw new GovernanceDenied('governed write session execution limit reached', 'operation_limit', 'max_tool_calls');
    const toolLimit = this.#policy.maxCallsPerTool[tool];
    if (
      toolLimit !== undefined &&
      (await this.#session.toolExecutionCount(tool)) + (this.#runningTools.get(tool) ?? 0) >= toolLimit
    )
      throw new GovernanceDenied(
        'governed write tool execution limit reached',
        'operation_limit',
        'max_calls_per_tool:' + tool,
      );
    this.#inFlight += 1;
    this.#runningTools.set(tool, (this.#runningTools.get(tool) ?? 0) + 1);
  }
}
