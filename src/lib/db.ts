import { StorableInterveneParserItem } from '@intervene/parser';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import { Query } from 'sift';

let db: PouchDB.Database<StorableInterveneParserItem>;

const getDb = async () => {
  if (db) return db;

  db = new PouchDB('embeddings');
  PouchDB.plugin(PouchFind);
  return db;
};

export const storeItems = async (items: StorableInterveneParserItem[]) => {
  const db = await getDb();

  const index = (await db.getIndexes()).indexes.find(
    (index) => index.name === 'embeddings_by_id',
  );

  if (!index) {
    await db.createIndex({
      index: {
        fields: ['id'],
        name: 'embeddings_by_id',
      },
    });
  }

  return db.bulkDocs(items);
};

export const queryItems = async (query: Query<StorableInterveneParserItem>) => {
  const db = await getDb();
  return db.find({ selector: query });
};
