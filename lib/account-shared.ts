import {AVATARS} from './game';
import type {GameRules} from './rules';
import type {ThemeId} from './themes';
export type Account={id:string,username:string,nickname:string,avatar:string,theme:ThemeId,rules:GameRules,revision:number};
export const avatarPath=(value:unknown)=>typeof value==='string'&&/^\/api\/avatars\/[a-f0-9-]{36}\.(webp|png|jpg)$/.test(value);
export function safeAvatar(value:unknown){return typeof value==='string'&&(AVATARS.includes(value)||avatarPath(value))?value:AVATARS[0]}
