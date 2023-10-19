import { InterveneParserItem, VectorStoreFunctions } from '@intervene/parser';
import { ChromaClient, Collection } from 'chromadb';

import { getConfig } from '@/lib/config';
import { queryItems, storeItems } from '@/lib/db';

import { IncludeEnum } from '../../../node_modules/chromadb/src/types';

let client: Collection;

const getClient = async () => {
  if (client) return client;

  const config = await getConfig();
  client = await new ChromaClient({
    path: config!.chromaHost!,
  }).getOrCreateCollection({ name: config!.chromaCollection! });

  return client;
};

export default {
  upsertItems: async (items) => {
    const client = await getClient();

    await client.upsert({
      ids: items.map((item) => item.id),
      embeddings: items.map((item) => item.embeddings),
      metadatas: items.map((item) => ({
        ...item.metadata,
        paths: JSON.stringify(item.metadata.paths),
      })),
    });

    await storeItems(items);
  },
  searchItems: async (_, embedding, limit, where) => {
    const client = await getClient();

    const results = await client.query({
      queryEmbeddings: embedding,
      nResults: limit,
      where,
      include: [IncludeEnum.Distances, IncludeEnum.Metadatas],
    });

    return results.ids[0].map((id, i) => {
      return {
        id,
        distance: results.distances![0][i]!,
        metadata: {
          ...results.metadatas![0][i]!,
          paths: JSON.parse(results.metadatas![0][i]!.paths as string),
        },
      } as InterveneParserItem;
    });
  },
  retrieveItems: async (ids) => {
    const response = await queryItems({ id: { $in: ids } });

    return response.docs;
  },
} satisfies VectorStoreFunctions;
