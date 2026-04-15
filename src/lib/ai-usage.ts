import { getSupabaseAdmin } from "./supabase-admin";

const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "gemini-flash-latest":  { input: 0.30, output: 2.50 },
  "gemini-2.5-flash":     { input: 0.30, output: 2.50 },
  "gemini-pro-latest":    { input: 1.25, output: 10.00 },
};

function pricing(model: string) {
  return PRICING_USD_PER_MTOK[model] ?? { input: 0, output: 0 };
}

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = pricing(model);
  const cost = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export interface LogAiUsageArgs {
  app: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAiUsage(args: LogAiUsageArgs): Promise<void> {
  const total = args.totalTokens ?? args.inputTokens + args.outputTokens;
  const cost = computeCostUsd(args.model, args.inputTokens, args.outputTokens);
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("ai_usage").insert({
      app: args.app,
      model: args.model,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      total_tokens: total,
      cost_usd: cost,
      request_id: args.requestId ?? null,
      metadata: args.metadata ?? null,
    });
    if (error) {
      console.error("[ai-usage] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[ai-usage] unexpected error:", e);
  }
}
