import { InterveneParserItem, VectorStoreFunctions } from '@intervene/parser';
import localforage from 'localforage';
import sift from 'sift';
import type { Voy as VoyT } from 'voy-search';

import { queryItems, storeItems } from '@/lib/db';

let client: VoyT;

const getClient = async () => {
  if (client) return client;

  const voyData = await localforage.getItem<string>('voy');
  const { Voy } = await import('voy-search');
  client = voyData ? Voy.deserialize(voyData) : new Voy();

  return client;
};

export default {
  upsertItems: async (items) => {
    const voy = await getClient();

    voy.add({
      embeddings: items.map((item) => ({
        id: item.id,
        embeddings: item.embeddings,
        title: JSON.stringify(item.metadata),
        url: '',
      })),
    });

    await localforage.setItem('voy', voy.serialize());

    await storeItems(items);
  },
  searchItems: async (_, embedding, limit, where) => {
    const voy = await getClient();

    // multiplying by 2 because voy does not have a metadata (+search)
    const results = voy.search(new Float32Array(embedding), limit * 2);
    let parsedResults = results.neighbors.map((result) => {
      return {
        id: result.id,
        metadata: JSON.parse(result.title),
      } as InterveneParserItem;
    });

    parsedResults = parsedResults.filter((item) => sift(where)(item.metadata));

    return parsedResults;
  },
  retrieveItems: async (ids) => {
    const response = await queryItems({ id: { $in: ids } });

    return response.docs;
  },
} satisfies VectorStoreFunctions;
