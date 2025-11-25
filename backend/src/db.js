import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createTables } from './schema.js';
import { seedDatabase } from './seeds.js';

let db;

export async function initDB() {
  console.log('Initializing Database...');
  db = await open({
    filename: './sanguo.db',
    driver: sqlite3.Database
  });
  console.log('Database connected.');

  await createTables(db);
  await seedDatabase(db);
}

export function getDB() {
  return db;
}
