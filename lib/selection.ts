export type TileSelection={tile:number,ordinal:number,code:string,round:number};
export function selectHandTile(room:any,index:number):TileSelection|null{
 const hand:number[]=room?.players?.[room.me]?.hand??[];
 if(!Number.isInteger(index)||index<0||index>=hand.length)return null;
 return {tile:hand[index],ordinal:hand.slice(0,index).filter(t=>t===hand[index]).length,code:room.code,round:room.round};
}
export function selectedHandIndex(room:any,selection:TileSelection|null):number|null{
 if(!selection||!room||room.code!==selection.code||room.round!==selection.round||!['play','claim'].includes(room.phase))return null;
 const hand:number[]=room.players?.[room.me]?.hand??[],indices=hand.flatMap((t,i)=>t===selection.tile?[i]:[]);
 return indices.length?indices[Math.min(selection.ordinal,indices.length-1)]:null;
}
