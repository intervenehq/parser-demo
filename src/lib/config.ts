import { CodeGenLanguage } from '@intervene/parser';
import Ajv from 'ajv';
import { SomeJSONSchema } from 'ajv/dist/types/json-schema';
import localforage from 'localforage';
import { z } from 'zod';

import { OpenApi } from '@/types/openapi';

export enum VectorStore {
  Voya = 'voya (in-browser, no setup required)',
  Chroma = 'chroma',
  Pinecone = 'pinecone',
}

export const configSchema = z.object({
  objective: z.string().min(10),
  openapis: z.array(z.custom<OpenApi>()),
  embeddingProvider: z.enum(['openai']),
  llmProvider: z.enum(['openai']),
  openaiApiKey: z.string().min(1),
  embeddingModel: z.enum(['text-embedding-ada-002']),
  vectorStore: z.nativeEnum(VectorStore),
  llmModel: z.enum(['gpt-3.5-turbo', 'gpt-4']),
  context: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val) as Record<string, SomeJSONSchema>;

      for (const key in parsed) {
        const ajv = new Ajv();
        ajv.compile(parsed[key]);
      }
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON schema supplied',
      });
    }

    return val;
  }),
  chromaHost: z.string().url().optional(),
  chromaCollection: z.string().optional(),
  pineconeIndex: z.string().optional(),
  pineconeEnvironment: z.string().optional(),
  pineconeApiKey: z.string().optional(),
  codeGenLanguage: z.nativeEnum(CodeGenLanguage),
});
export type ConfigSchemaZ = z.infer<typeof configSchema>;

export const defaultConfig: ConfigSchemaZ = {
  objective: '',
  openaiApiKey: '',
  openapis: [],
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-ada-002',
  llmProvider: 'openai',
  llmModel: 'gpt-4',
  context: ['{', '  ', '}'].join('\n'),
  vectorStore: VectorStore.Voya,
  chromaHost: 'http://0.0.0.0:8000',
  chromaCollection: 'intervene-parser',
  codeGenLanguage: CodeGenLanguage.javascript,
};

export const CONFIG_KEY = 'CONFIG_LOCAL_STORAGE';

export const getConfig = async () => {
  return await localforage.getItem<ConfigSchemaZ>(CONFIG_KEY);
};

export const setConfig = async (config: ConfigSchemaZ) => {
  await localforage.setItem(CONFIG_KEY, config);
};
