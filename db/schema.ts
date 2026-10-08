import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('mahjong_rooms', {
  code: text('code').primaryKey(), state: text('state').notNull(),
  version: integer('version').notNull().default(0), updated: integer('updated').notNull(),
});
export const chat = sqliteTable('mahjong_chat', {
 id:text('id').primaryKey(),code:text('code').notNull(),sender:text('sender').notNull(),clientId:text('client_id').notNull(),
 name:text('name').notNull(),kind:text('kind').notNull(),content:text('content').notNull(),at:integer('at').notNull(),
}, t=>[index('chat_room_time').on(t.code,t.at),index('chat_sender_time').on(t.code,t.sender,t.at),uniqueIndex('chat_retry').on(t.code,t.sender,t.clientId)]);
