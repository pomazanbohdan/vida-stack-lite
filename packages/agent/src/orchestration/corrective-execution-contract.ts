import z from 'zod';

const text = z.string().min(1).max(512);
const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const correctiveExecutionSchema = z
  .object({
    schema: z.literal('CorrectiveExecution/v1'),
    base_run_id: text,
    engine_run_id: z.string().uuid(),
    correction_generation: z.number().int().positive(),
    stage_ids: z.array(text).min(1),
    authorization: z
      .object({ schema: z.literal('CorrectiveAssignmentAuthorization/v1'), path: text, sha256: digest })
      .strict(),
  })
  .strict();
export type CorrectiveExecution = z.infer<typeof correctiveExecutionSchema>;
