export const THEMES=[
 {id:'jade',name:'经典翡翠绿',description:'经典深绿 · 暖白与柔金',page:'#f5f7f3',card:'#ffffff',ink:'#233c34',muted:'#62786c',border:'#dce5df',felt:'#286344',light:'#357450',dark:'#194939',hand:'#15392e',tableText:'#f4f2df',tableMuted:'#c4d6c6',accent:'#24624e'},
 {id:'midnight',name:'午夜蓝',description:'暮蓝与雾白 · 同色深蓝按钮',page:'#EAE0CF',card:'#fcfaf5',ink:'#213448',muted:'#547792',border:'#94B4C1',felt:'#547792',light:'#6488a1',dark:'#213448',hand:'#213448',tableText:'#ffffff',tableMuted:'#e8eef3',accent:'#213448'},
 {id:'grape',name:'葡萄紫',description:'柔紫与鸢尾 · 紫罗兰按钮',page:'#f5eff8',card:'#fefbff',ink:'#333651',muted:'#655780',border:'#E2BBE9',felt:'#7776B3',light:'#9B86BD',dark:'#5A639C',hand:'#4a5284',tableText:'#ffffff',tableMuted:'#f1edf9',accent:'#5A639C'},
 {id:'walnut',name:'胡桃木',description:'奶油与胡桃 · 温暖棕色按钮',page:'#F8EDE3',card:'#fffaf5',ink:'#49352e',muted:'#796457',border:'#DFD3C3',felt:'#8D493A',light:'#a96853',dark:'#63382e',hand:'#63382e',tableText:'#fff8ee',tableMuted:'#f3e1d2',accent:'#8D493A'},
 {id:'rose',name:'玫瑰灰',description:'奶茶与灰玫瑰 · 柔雾玫瑰按钮',page:'#F1E5D1',card:'#fffaf3',ink:'#443134',muted:'#765457',border:'#DBB5B5',felt:'#C39898',light:'#DBB5B5',dark:'#765457',hand:'#DBB5B5',tableText:'#382529',tableMuted:'#503237',accent:'#DBB5B5'},
 {id:'sakura',name:'樱花粉',description:'樱花与暖白 · 同色淡粉按钮',page:'#F9F5F6',card:'#fffcfd',ink:'#57333f',muted:'#7c5262',border:'#FDCEDF',felt:'#F2BED1',light:'#F8E8EE',dark:'#d79bb1',hand:'#F8E8EE',tableText:'#482835',tableMuted:'#68414f',accent:'#F2BED1'},
 {id:'peach',name:'奶油蜜桃',description:'奶油与蜜桃 · 轻柔蜜桃按钮',page:'#FFF5E4',card:'#fffdf6',ink:'#56342e',muted:'#82554d',border:'#FFD1D1',felt:'#FF9494',light:'#FFE3E1',dark:'#d37878',hand:'#FFE3E1',tableText:'#482727',tableMuted:'#633939',accent:'#FF9494'},
].map(t=>({...t,buttonText:({rose:'#382529',sakura:'#482835',peach:'#482727'} as Record<string,string>)[t.id]??'#ffffff',chromeText:({rose:'#ffffff',sakura:'#482835',peach:'#482727'} as Record<string,string>)[t.id]??'#ffffff',disabled:'#e3e7ec',disabledText:'#53616e',texture:({
 jade:'none',
 midnight:'radial-gradient(circle at 20% 30%,#ffffff16 1px,transparent 2px),radial-gradient(circle at 70% 60%,#ffffff10 1px,transparent 2px)',
 grape:'repeating-linear-gradient(45deg,#ffffff07 0 1px,transparent 1px 9px)',
 walnut:'repeating-linear-gradient(92deg,#0000000b 0 1px,transparent 1px 11px,#ffffff05 11px 12px,transparent 12px 23px)',
 rose:'repeating-linear-gradient(0deg,#ffffff08 0 1px,transparent 1px 7px),repeating-linear-gradient(90deg,#ffffff05 0 1px,transparent 1px 7px)',
 sakura:'radial-gradient(ellipse at 15% 15%,#ffffff13 0 3px,transparent 4px),radial-gradient(ellipse at 80% 65%,#ffffff0d 0 4px,transparent 5px)',
 peach:'repeating-linear-gradient(15deg,#ffffff12 0 1px,transparent 1px 6px)',
 } as Record<string,string>)[t.id]})) as readonly {id:'jade'|'midnight'|'grape'|'walnut'|'rose'|'sakura'|'peach',name:string,description:string,page:string,card:string,ink:string,muted:string,border:string,felt:string,light:string,dark:string,hand:string,tableText:string,tableMuted:string,accent:string,buttonText:string,chromeText:string,disabled:string,disabledText:string,texture:string}[];
export type ThemeId=typeof THEMES[number]['id'];
export function validTheme(value:unknown):value is ThemeId{return THEMES.some(t=>t.id===value)}
