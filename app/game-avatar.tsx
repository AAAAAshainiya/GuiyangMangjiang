import {Bot} from 'lucide-react';
import {avatarPath} from '@/lib/account-shared';
export function PlayerAvatar({avatar,name='',bot=false,size=20}:{avatar?:string,name?:string,bot?:boolean,size?:number}){return bot?<Bot size={size} className="session-bot-avatar"/>:avatarPath(avatar)?<img className="player-photo" src={avatar} alt={name+'头像'} loading="lazy" draggable={false}/>:<>{avatar??name.slice(0,1)}</>}
