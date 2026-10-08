import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('mahjong_rooms', {
  code: text('code').primaryKey(), state: text('state').notNull(),
  version: integer('version').notNull().default(0), updated: integer('updated').notNull(),
});
