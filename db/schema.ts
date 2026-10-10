import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('mahjong_rooms', {
  code: text('code').primaryKey(), state: text('state').notNull(),
  version: integer('version').notNull().default(0), updated: integer('updated').notNull(),
});
export const chat = sqliteTable('mahjong_chat', {
 id:text('id').primaryKey(),code:text('code').notNull(),sender:text('sender').notNull(),clientId:text('client_id').notNull(),
 name:text('name').notNull(),kind:text('kind').notNull(),content:text('content').notNull(),at:integer('at').notNull(),
}, t=>[index('chat_room_time').on(t.code,t.at),index('chat_sender_time').on(t.code,t.sender,t.at),uniqueIndex('chat_retry').on(t.code,t.sender,t.clientId)]);

export const releases = sqliteTable('mahjong_releases', {
 version: integer('version').primaryKey(), deployedAt: text('deployed_at').notNull(),
 activity: text('activity').notNull(), commit: text('commit_sha').notNull(),
});
export const users=sqliteTable('mahjong_users',{
 id:text('id').primaryKey(),username:text('username').notNull(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),nickname:text('nickname').notNull(),avatar:text('avatar').notNull(),theme:text('theme').notNull(),rules:text('rules').notNull(),revision:integer('revision').notNull().default(1),createdAt:integer('created_at').notNull(),recoveryHash:text('recovery_hash'),
},t=>[uniqueIndex('users_username').on(t.username)]);
export const sessions=sqliteTable('mahjong_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),expires:integer('expires').notNull(),createdAt:integer('created_at').notNull().default(0),lastSeen:integer('last_seen').notNull().default(0),device:text('device').notNull().default('旧设备'),
},t=>[index('sessions_user').on(t.userId),index('sessions_expiry').on(t.expires)]);
export const authLimits=sqliteTable('mahjong_auth_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),resetAt:integer('reset_at').notNull()});
export const avatars=sqliteTable('mahjong_avatars',{key:text('key').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),createdAt:integer('created_at').notNull()});
export const replays=sqliteTable('mahjong_replays',{id:text('id').primaryKey(),data:text('data').notNull(),createdAt:integer('created_at').notNull()});
export const records=sqliteTable('mahjong_account_records',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),gameId:text('game_id').notNull(),mode:text('mode').notNull(),roomCode:text('room_code').notNull(),round:integer('round').notNull(),at:integer('at').notNull(),delta:integer('delta').notNull(),bill:text('bill').notNull(),hasReplay:integer('has_replay').notNull().default(0),favorite:integer('favorite').notNull().default(0),
},t=>[uniqueIndex('records_user_game').on(t.userId,t.gameId),index('records_user_time').on(t.userId,t.at),index('records_replay_refs').on(t.gameId,t.hasReplay),index('records_user_replays').on(t.userId,t.hasReplay,t.favorite,t.at)]);
export const backupJobs=sqliteTable('mahjong_backup_jobs',{key:text('key').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),data:text('data').notNull(),updated:integer('updated').notNull()},t=>[index('backup_user').on(t.userId,t.updated)]);
