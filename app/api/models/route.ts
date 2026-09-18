/**
 * GET /api/models — what the model host is holding, and whether it is up.
 *
 * The answer always has HTTP 200 when this application is healthy, even when the model host
 * is not. "The host is down" is a fact about the host that the interface needs to render;
 * turning it into an HTTP error would make the browser's fetch fail and lose the reason.
 */
import { listModels } from "@/lib/ollama";
import { defaultModel } from "@/lib/ollama";
import type { HostInfo } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const result = await listModels();

  const preferred = defaultModel();
  const installed = result.models.some((model) => model.name === preferred);

  const payload: HostInfo & { suggestedModel: string } = {
    reachable: result.reachable,
    host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434",
    version: result.version,
    models: result.models,
    problem: result.problem,
    // If the configured default is not installed, the first model that is. An interface that
    // opens with a model that is not there would fail on the first message and blame nobody.
    suggestedModel: installed ? preferred : (result.models[0]?.name ?? ""),
  };

  return Response.json(payload);
}
