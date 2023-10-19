import { CreateEmbeddingsFunction } from '@intervene/parser';
import OpenAI from 'openai';

import { getConfig } from '@/lib/config';

let openai: OpenAI;

export const getClient = async () => {
  if (openai) return openai;

  const config = await getConfig();
  openai = new OpenAI({
    apiKey: config!.openaiApiKey,
    dangerouslyAllowBrowser: true,
  });

  return openai;
};

export const createEmbeddings: CreateEmbeddingsFunction = async (inputs) => {
  const client = await getClient();
  const config = await getConfig();

  const response = await client.embeddings.create({
    input: inputs,
    model: config!.embeddingModel,
  });

  return response.data.map((embedding) => [
    inputs[embedding.index],
    embedding.embedding,
  ]);
};
