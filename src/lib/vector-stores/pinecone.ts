import { InterveneParserItem, VectorStoreFunctions } from '@intervene/parser';
import { Index, Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import sift from 'sift';

import { getConfig } from '@/lib/config';
import { queryItems, storeItems } from '@/lib/db';

let client: Index;

const getClient = async () => {
  if (client) return client;

  const config = await getConfig();
  client = new Pinecone({
    apiKey: config!.pineconeApiKey!,
    environment: config!.pineconeEnvironment!,
  }).index(config!.pineconeIndex!);

  return client;
};

export default {
  upsertItems: async (items) => {
    const client = await getClient();

    let batch: PineconeRecord[] = [];

    for (const item of items) {
      batch.push({
        id: item.id.slice(0, 511),
        values: item.embeddings,
        metadata: item.metadata,
      });

      const batchSizeInBytes = Buffer.from(JSON.stringify(batch)).length;
      if (batchSizeInBytes >= 4000000) {
        await client.upsert(batch);
        batch = [];
      }
    }

    await storeItems(items);
  },
  searchItems: async (_, embedding, limit, where) => {
    const client = await getClient();

    const results = (
      await client.query({
        // multiplied by 2 because pinecone does not have a metadata search
        topK: limit * 2,
        vector: embedding,
        includeMetadata: true,
      })
    ).matches
      .map((result) => {
        return {
          id: result.id.slice(0, 511),
          distance: result.score,
          metadata: result.metadata,
        } as InterveneParserItem;
      })
      .filter((item) => sift(where)(item.metadata));

    return results;
  },
  retrieveItems: async (ids) => {
    const response = await queryItems({ id: { $in: ids } });

    return response.docs;
  },
} satisfies VectorStoreFunctions;
