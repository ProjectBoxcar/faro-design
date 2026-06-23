import { NextResponse } from "next/server";
import { z } from "zod";
import { setApiKey, apiKeyStatus } from "@/lib/settings";

const SaveSchema = z.object({
  apiKey: z.string().optional(), // empty/omitted clears it
});

export async function GET() {
  return NextResponse.json(apiKeyStatus());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const key = (parsed.data.apiKey ?? "").trim();
  // Light sanity check so an obvious paste mistake gives feedback.
  if (key && !key.startsWith("sk-")) {
    return NextResponse.json(
      { error: "That doesn't look like an Anthropic API key (they start with “sk-”)." },
      { status: 400 }
    );
  }
  setApiKey(key || null);
  return NextResponse.json(apiKeyStatus());
}

export async function DELETE() {
  setApiKey(null);
  return NextResponse.json(apiKeyStatus());
}
