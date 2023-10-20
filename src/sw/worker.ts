/// <reference lib="webworker" />

import { Logger, Parser, VectorStoreFunctions } from '@intervene/parser';

import { getConfig, VectorStore } from '@/lib/config';
import OpenAILLM from '@/lib/llm/openai';
import { createEmbeddings } from '@/lib/openai';
import chromadb from '@/lib/vector-stores/chromadb';
import pinecone from '@/lib/vector-stores/pinecone';
import voy from '@/lib/vector-stores/voy';

declare const self: DedicatedWorkerGlobalScope;

export const runAgent = async () => {
  const config = await getConfig();
  if (!config) return;

  let vectorStoreFunctions: VectorStoreFunctions;

  switch (config.vectorStore) {
    case VectorStore.Chroma:
      vectorStoreFunctions = chromadb;
      break;
    case VectorStore.Pinecone:
      vectorStoreFunctions = pinecone;
      break;
    default:
      vectorStoreFunctions = voy;
  }

  const logger: Logger = {
    log: (...args) => {
      self.postMessage({
        type: 'log',
        message: args,
      });
    },
    error: (...args) => {
      self.postMessage({
        type: 'error',
        message: args,
      });
    },
    warn: (...args) => {
      self.postMessage({
        type: 'warn',
        message: args,
      });
    },
    info: (...args) => {
      self.postMessage({
        type: 'info',
        message: args,
      });
    },
  };

  const parser = new Parser({
    embeddingFunctions: {
      ...vectorStoreFunctions,
      createEmbeddings,
    },
    llm: new OpenAILLM(logger, config.llmModel === 'gpt-3.5-turbo'),
    logger: logger,
    language: config.codeGenLanguage,
  });

  self.postMessage({
    type: 'done',
    data: await parser.parse(
      config.objective,
      JSON.parse(config.context),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config.openapis as any,
    ),
  });
};

self.addEventListener('message', async (e) => {
  if (e.data === 'run') {
    try {
      await runAgent();
    } catch (e) {
      self.postMessage({
        type: 'done',
        error: e,
      });
      console.error(e);
    }
  }
});
