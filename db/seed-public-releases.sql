-- 原站公开部署记录，仅用于恢复版本表，不含玩家数据。
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (30,'2026-10-09T15:38:28.815Z','版本历史、结算翻鸡与机器人头像','6e0f7d52feb7641e8aa159fb509f6c241553a658') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (31,'2026-10-09T15:59:37.599Z','单人普通入口、快速说明与头像恢复','b460b78c1be7c6ae9e1a3fe200cbed22975cd22e') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (32,'2026-10-09T18:13:10.579Z','账号资料与个人规则、主题配色、对局记录与收藏回放','fe8911771a3a62c79eb391bed812019af16eb24b') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (33,'2026-10-10T02:38:39.929Z','账号安全与备份、按模式回放、可选杠及完整主题配色','c004edd8d229536cbe89747365c4e9ecaf0940b3') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (34,'2026-10-10T03:48:08.622Z','经典翡翠绿与色卡配色、退出修复、Excel规则账单及回放全屏适配','be152457d6c05a5ce2132fb5492107c1033441d6') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (35,'2026-10-10T04:17:50.794Z','配色首屏与纯色牌桌、单人手动开局、再点出牌及弹窗层级','93b53734362f5bdceb9d0a1e9b4d7ce8a7969458') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (36,'2026-10-10T04:25:17.913Z','单人入口区分进入牌桌与开始游戏','ebfa4402a8ccca62e747b9689d0e208bfbd0f077') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (37,'2026-10-10T05:33:05.667Z','单人随时重开、任意阶段快速切换与按钮文字对比修复','22fcfca3c2564c804e80828bd88c83c49941d0ab') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (38,'2026-10-10T07:54:53.907Z','邀请直达房间、统一互动记录与精细表情动画','393828ac7721ba7dd8dd23317e865610407c2ef2') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (39,'2026-10-10T08:24:50.684Z','结算期间互动分区、删除鼓掌与30种Emoji','566eedb8558ce41eeafb21ef620495ebd9d7e55b') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (40,'2026-10-10T08:53:38.170Z','结算互动直接展开与手机手牌区空间复用','364f9bf6d2bae30ad413f80f3b5df3961b8684d4') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (41,'2026-10-10T13:05:08.941Z','结算互动折叠、同尺寸弹窗与手机聊天区扩展','6936fceff50206fa98a6da709135f40577436744') ON CONFLICT(version) DO NOTHING;
INSERT INTO mahjong_releases (version,deployed_at,activity,commit_sha) VALUES (42,'2026-10-10T13:20:26.322Z','结算互动按钮文字对比、图标与边框增强','eb6fc2e5cdedc9564de3c8b4f3eee0f310de0cbe') ON CONFLICT(version) DO NOTHING;
