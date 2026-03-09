import OpenAI from "openai";
import { logger } from "../logger";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AICallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

const DEFAULT_MODEL = "gpt-4.1";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const DEFAULT_TIMEOUT_MS = 120000;

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options: AICallOptions = {},
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.3,
    maxTokens = 4096,
    responseFormat = "text",
  } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      const response = await openai.chat.completions.create(
        {
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          ...(responseFormat === "json"
            ? { response_format: { type: "json_object" } }
            : {}),
        },
        { signal: controller.signal },
      );

      clearTimeout(timeout);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return content;
    } catch (err: any) {
      const isRetryable =
        err?.status === 429 ||
        err?.status === 500 ||
        err?.status === 503 ||
        err?.code === "ECONNRESET";

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn("OpenAI call failed, retrying", {
          source: "ai",
          attempt,
          delay,
          error: err.message,
        });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      logger.error("OpenAI call failed permanently", {
        source: "ai",
        attempt,
        error: err.message,
        model,
      });
      throw err;
    }
  }

  throw new Error("Unreachable: max retries exceeded");
}

export async function callAIJson<T = any>(
  systemPrompt: string,
  userPrompt: string,
  options: Omit<AICallOptions, "responseFormat"> = {},
): Promise<T> {
  const raw = await callAI(systemPrompt, userPrompt, {
    ...options,
    responseFormat: "json",
  });
  return JSON.parse(raw) as T;
}
