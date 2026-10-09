export type ReleaseRecord = {version:number,deployedAt:string,activity:string,commit:string};
// Verified historical deployment records supplied by the owner.
export const RELEASE_HISTORY: ReleaseRecord[] = [
  {
    "version": 1,
    "deployedAt": "2026-10-08T08:19:41+08:00",
    "activity": "线上麻将初版与人机补位",
    "commit": "6c0bc547"
  },
  {
    "version": 2,
    "deployedAt": "2026-10-08T08:44:30+08:00",
    "activity": "牌面素材、弃牌布局与冲锋鸡横放",
    "commit": "daf3097c"
  },
  {
    "version": 3,
    "deployedAt": "2026-10-08T18:21:47+08:00",
    "activity": "摸牌红点、两秒人机与碰杠展示",
    "commit": "c10b6341"
  },
  {
    "version": 4,
    "deployedAt": "2026-10-08T18:46:50+08:00",
    "activity": "固定鸡与听牌资格计分",
    "commit": "f57a6b21"
  },
  {
    "version": 5,
    "deployedAt": "2026-10-08T19:42:04+08:00",
    "activity": "胡豆分调整、中央结算与同房聊天",
    "commit": "7fb249c3"
  },
  {
    "version": 6,
    "deployedAt": "2026-10-08T20:24:30+08:00",
    "activity": "听牌／操作漏洞与中央碰杠胡按钮",
    "commit": "a5886350"
  },
  {
    "version": 7,
    "deployedAt": "2026-10-08T20:40:02+08:00",
    "activity": "未听牌不收豆与付款义务",
    "commit": "55aa4ab5"
  },
  {
    "version": 8,
    "deployedAt": "2026-10-08T21:44:43+08:00",
    "activity": "牌桌音效与开关",
    "commit": "14fd5730"
  },
  {
    "version": 9,
    "deployedAt": "2026-10-08T22:35:33+08:00",
    "activity": "卡顿恢复、四位邀请码与定向互动",
    "commit": "22062888"
  },
  {
    "version": 10,
    "deployedAt": "2026-10-09T00:42:17+08:00",
    "activity": "新版胡分、牌型相加与热炮烧鸡豆",
    "commit": "03422997"
  },
  {
    "version": 11,
    "deployedAt": "2026-10-09T01:05:32+08:00",
    "activity": "详细个人收付账单",
    "commit": "80b59761"
  },
  {
    "version": 12,
    "deployedAt": "2026-10-09T01:45:13+08:00",
    "activity": "操作确认、防重复与断线恢复",
    "commit": "6217ff4c"
  },
  {
    "version": 13,
    "deployedAt": "2026-10-09T02:51:36+08:00",
    "activity": "单吊替代、快速／新手模式与连续对局",
    "commit": "44f799a8"
  },
  {
    "version": 14,
    "deployedAt": "2026-10-09T10:52:42+08:00",
    "activity": "碰杠来源、结算顺序、全屏与单人暂停",
    "commit": "de34bf7e"
  },
  {
    "version": 15,
    "deployedAt": "2026-10-09T11:16:10+08:00",
    "activity": "快速0.5秒与首局随机庄家",
    "commit": "a0e3bf0c"
  },
  {
    "version": 16,
    "deployedAt": "2026-10-09T11:29:00+08:00",
    "activity": "结算遮挡修复与独立下一局面板",
    "commit": "02d562e0"
  },
  {
    "version": 17,
    "deployedAt": "2026-10-09T12:20:06+08:00",
    "activity": "纯翻鸡免扣、历史下移与房主规则编辑",
    "commit": "744c3401"
  },
  {
    "version": 18,
    "deployedAt": "2026-10-09T12:43:41+08:00",
    "activity": "手机横竖屏、听胡牌状态与紧凑准备条",
    "commit": "9b3ccaf7"
  },
  {
    "version": 19,
    "deployedAt": "2026-10-09T13:03:36+08:00",
    "activity": "竖屏手牌可见、仅牌桌全屏与规则折叠",
    "commit": "a3f95485"
  },
  {
    "version": 20,
    "deployedAt": "2026-10-09T14:12:50+08:00",
    "activity": "十四张手牌适配、弃牌裁切与闪烁修复",
    "commit": "5613929f"
  },
  {
    "version": 21,
    "deployedAt": "2026-10-09T15:37:51+08:00",
    "activity": "资料与选模式流程、随机真人房主转移",
    "commit": "e264e7a1"
  },
  {
    "version": 22,
    "deployedAt": "2026-10-09T15:45:09+08:00",
    "activity": "模式面板回到牌桌右侧",
    "commit": "d22fd44f"
  },
  {
    "version": 23,
    "deployedAt": "2026-10-09T15:59:48+08:00",
    "activity": "单人结算崩溃修复及各模式回归",
    "commit": "0cb83320"
  },
  {
    "version": 24,
    "deployedAt": "2026-10-09T16:21:47+08:00",
    "activity": "正式名称、Logo、合法操作提示与小按钮",
    "commit": "6b61334b"
  },
  {
    "version": 25,
    "deployedAt": "2026-10-09T16:44:15+08:00",
    "activity": "房主终止本局与非对局期间踢人",
    "commit": "9d0a9c31"
  },
  {
    "version": 26,
    "deployedAt": "2026-10-09T19:09:26+08:00",
    "activity": "单人超时暂停与整张冲锋鸡横放",
    "commit": "e29cfc2f"
  },
  {
    "version": 27,
    "deployedAt": "2026-10-09T20:25:50+08:00",
    "activity": "收扣明细、水印、桌内教学、预选与人机重名",
    "commit": "4f46b96a"
  },
  {
    "version": 28,
    "deployedAt": "2026-10-09T21:47:19+08:00",
    "activity": "暗杠亮牌、自摸不胡、流局查叫与责任鸡",
    "commit": "00d3c640"
  },
  {
    "version": 29,
    "deployedAt": "2026-10-09T22:02:00+08:00",
    "activity": "中央下一局按钮更醒目",
    "commit": "4437baee"
  }
];
