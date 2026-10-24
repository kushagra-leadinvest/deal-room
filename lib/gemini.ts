export interface Extraction {
  summary: string | null;
  revenue: string | null;
  traction: string | null;
  raise_ask: string | null;
}

const PROMPT = `You are helping a venture capital analyst. From the call transcript or meeting notes below, extract:
- summary: one paragraph (2-4 sentences) on what the company does, for whom, and how it makes money.
- revenue: revenue numbers with periods and currency exactly as stated (ARR, MRR, GMV, run-rate, growth). null if none.
- traction: other traction metrics (customers, users, retention, pilots, partnerships). null if none.
- raise_ask: how much they are raising, instrument, valuation if stated. null if not mentioned.
Only use facts stated in the text. Do not guess. Keep numbers in the units used in the text.

Transcript:
"""
`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING", nullable: true },
    revenue: { type: "STRING", nullable: true },
    traction: { type: "STRING", nullable: true },
    raise_ask: { type: "STRING", nullable: true },
  },
  required: ["summary", "revenue", "traction", "raise_ask"],
};

export function geminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

/** Call Gemini (REST, no SDK so it runs on Workers). Throws on any failure. */
export async function extractFromTranscript(transcript: string): Promise<Extraction> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${PROMPT}${transcript.slice(0, 200_000)}\n"""` }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    const detail = res.status === 429 ? "free-tier rate limit reached, try again in a minute" : `HTTP ${res.status}`;
    throw new Error(`Gemini ${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned no content");

  const parsed = JSON.parse(text) as Partial<Extraction>;
  const clean = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null);
  return {
    summary: clean(parsed.summary),
    revenue: clean(parsed.revenue),
    traction: clean(parsed.traction),
    raise_ask: clean(parsed.raise_ask),
  };
}
