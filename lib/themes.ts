export const THEMES=[
 {id:'jade',name:'翡翠绿',description:'经典深绿 · 暖白与柔金',page:'#f5f7f3',card:'#ffffff',ink:'#233c34',muted:'#62786c',border:'#dce5df',felt:'#286344',light:'#357450',dark:'#194939',hand:'#15392e',tableText:'#f4f2df',tableMuted:'#c4d6c6',accent:'#24624e'},
 {id:'midnight',name:'午夜蓝',description:'沉静深蓝 · 冰蓝点缀',page:'#eef3f8',card:'#fdfefe',ink:'#20354b',muted:'#60758a',border:'#d9e3ec',felt:'#294a6b',light:'#375f86',dark:'#173149',hand:'#1c3850',tableText:'#f0f6ff',tableMuted:'#c4d9ed',accent:'#315f91'},
 {id:'grape',name:'葡萄紫',description:'醇厚深紫 · 淡紫灰',page:'#f4f1f7',card:'#fefcff',ink:'#47354f',muted:'#7b6786',border:'#e4dce9',felt:'#60426b',light:'#785481',dark:'#3b2946',hand:'#44304d',tableText:'#fff4fc',tableMuted:'#e5cfe9',accent:'#755185'},
 {id:'walnut',name:'胡桃木',description:'温暖深棕 · 奶油与琥珀',page:'#f6f2ed',card:'#fffdf9',ink:'#49382c',muted:'#806b58',border:'#e8dfd4',felt:'#725039',light:'#896349',dark:'#463120',hand:'#503724',tableText:'#fff4de',tableMuted:'#e9d0af',accent:'#835c35'},
 {id:'rose',name:'玫瑰灰',description:'暗玫瑰 · 温柔暖灰',page:'#f6f1f2',card:'#fffcfd',ink:'#533c45',muted:'#866c75',border:'#e8dce1',felt:'#75515f',light:'#8c6876',dark:'#4e3541',hand:'#593c49',tableText:'#fff0f3',tableMuted:'#ebd0db',accent:'#8d526a'},
 {id:'sakura',name:'樱花粉',description:'柔和灰粉 · 莓果按钮',page:'#fff5f7',card:'#fffdfd',ink:'#633448',muted:'#896573',border:'#efdce3',felt:'#bd8b9e',light:'#d3a6b6',dark:'#805168',hand:'#8c5a71',tableText:'#fff9fb',tableMuted:'#fff0f5',accent:'#a54468'},
 {id:'peach',name:'奶油蜜桃',description:'柔杏奶油 · 蜜桃橘',page:'#fff7ef',card:'#fffdf9',ink:'#613e2e',muted:'#8e6c53',border:'#eedfce',felt:'#e7b58f',light:'#f0c9a9',dark:'#a9704e',hand:'#bb8260',tableText:'#382216',tableMuted:'#513320',accent:'#ac5434'},
] as const;
export type ThemeId=typeof THEMES[number]['id'];
export function validTheme(value:unknown):value is ThemeId{return THEMES.some(t=>t.id===value)}
