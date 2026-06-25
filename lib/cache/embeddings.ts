import OpenAI from "openai";

const MODEL = "togethercomputer/m2-bert-80M-8k-retrieval";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://api.together.xyz/v1",
    });
  }
  return _client;
}

export async function embedIntent(text: string): Promise<number[]> {
  const response = await client().embeddings.create({
    model: MODEL,
    input: text,
  });
  return response.data[0].embedding;
}
