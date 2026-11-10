(function (root) {
  'use strict';
  const D = {};
  D.items = {
    wood: {name:'木板', value:1, type:'材料'}, rope:{name:'绳索', value:2, type:'材料'},
    metal:{name:'废铁', value:3, type:'材料'}, cloth:{name:'织布', value:3, type:'材料'},
    water:{name:'淡水', value:3, type:'补给'}, food:{name:'口粮', value:3, type:'补给'},
    herb:{name:'药草', value:5, type:'补给'}, parts:{name:'精密零件', value:12, type:'材料'},
    crystal:{name:'潮汐结晶', value:35, type:'稀有'}, seed:{name:'种子', value:8, type:'材料'},
    map:{name:'航图残页', value:0, type:'剧情'}, core:{name:'古代核心',value:0,type:'剧情'}
  };
  D.powers = [
    {id:'multiply',name:'十倍增幅',mark:'×10',color:'gold',desc:'每天选中一个箱子，普通物资十倍。你的第一桶金，比别人来得更汹涌。',evolve:'第15天起，每天可连续增幅两个箱子。'},
    {id:'destiny',name:'天命开箱',mark:'✧',color:'violet',desc:'每天首箱必定升阶，额外三选一。每累计打开20个箱子，获得珍稀奖励。',evolve:'第15天起，首箱额外提升一阶。'},
    {id:'builder',name:'神级建造',mark:'⌂',color:'teal',desc:'每天一次，普通建材仅需25%，设施还可选择强化效果或不占空间。',evolve:'第15天起，每天拥有两次系统建造权限。'},
    {id:'rewrite',name:'命运改写',mark:'↻',color:'rose',desc:'每天一次，把一次危机或受挫改写成机遇。风浪里，也有你的宝藏。',evolve:'第15天起，改写事件还会获得潮汐结晶。'}
  ];
  D.rafts = [
    {name:'破旧木排',comfort:5,safety:10,wind:5,space:4,cost:{}},
    {name:'加固木筏',comfort:15,safety:25,wind:25,space:8,cost:{wood:18,rope:5}},
    {name:'避风平台',comfort:30,safety:45,wind:40,space:14,cost:{wood:45,rope:12,metal:10}},
    {name:'海上居所',comfort:50,safety:60,wind:60,space:22,cost:{wood:100,rope:25,metal:25,parts:3}},
    {name:'远航基地',comfort:70,safety:80,wind:80,space:34,cost:{wood:180,rope:40,metal:50,parts:8,crystal:2}},
    {name:'浮海庄园',comfort:90,safety:95,wind:95,space:50,cost:{wood:300,rope:60,metal:90,parts:16,crystal:6}}
  ];
  D.facilities = [
    {id:'rain',name:'集雨器',mark:'◒',level:1,space:1,cost:{wood:6,cloth:2},desc:'每天自动获得2份淡水',water:2},
    {id:'net',name:'扩展打捞网',mark:'▦',level:1,space:1,cost:{wood:8,rope:4},desc:'每天增加2个箱子',boxes:2},
    {id:'rig',name:'防风索具',mark:'⋈',level:1,space:1,cost:{rope:4,wood:4},desc:'防风度 +20',wind:20},
    {id:'guard',name:'加固护栏',mark:'▤',level:1,space:1,cost:{wood:10,metal:3},desc:'安全度 +18',safety:18},
    {id:'bed',name:'保暖卧铺',mark:'▰',level:2,space:1,cost:{cloth:5,wood:8},desc:'舒适度 +20，寒潮损伤减半',comfort:20},
    {id:'garden',name:'种植箱',mark:'♧',level:2,space:2,cost:{wood:12,seed:2},desc:'每天自动获得2份口粮',food:2},
    {id:'radio',name:'修复接收器',mark:'◉',level:2,space:1,cost:{metal:6,parts:2},desc:'免费获取可靠天气情报，接收特殊人物信号'},
    {id:'compass',name:'寻宝罗盘',mark:'◇',level:2,space:1,cost:{metal:5,parts:2},desc:'高品质箱子概率提高',quality:0.16},
    {id:'collector',name:'自动收集装置',mark:'≋',level:3,space:2,cost:{wood:18,metal:12,parts:3},desc:'每天增加3个箱子',boxes:3},
    {id:'filter',name:'净水设备',mark:'◈',level:3,space:2,cost:{metal:12,parts:4},desc:'每天自动获得5份淡水',water:5},
    {id:'hook',name:'深海打捞钩',mark:'J',level:3,space:1,cost:{metal:10,rope:8,parts:2},desc:'解锁深海箱，体质探索判定 +12'},
    {id:'locker',name:'密封储物柜',mark:'▣',level:3,space:1,cost:{wood:15,metal:8},desc:'灾害中的普通物资损失减少一半'},
    {id:'deck',name:'扩展甲板',mark:'⊞',level:3,space:0,cost:{wood:25,metal:8,rope:6},desc:'空间 +8',extraSpace:8},
    {id:'kitchen',name:'海风厨房',mark:'♨',level:4,space:2,cost:{wood:30,metal:15,parts:3},desc:'每天自动获得4份口粮，舒适度 +8',food:4,comfort:8},
    {id:'greenhouse',name:'海上温室',mark:'♧',level:5,space:4,cost:{wood:50,cloth:20,parts:6},desc:'每天自动获得8份口粮，舒适度 +10',food:8,comfort:10},
    {id:'beacon',name:'守夜灯塔',mark:'✦',level:5,space:2,cost:{metal:30,parts:8,crystal:3},desc:'防风、安全各 +15，解锁更远的海域',wind:15,safety:15}
  ];
  D.events = [
    {id:'calm',name:'平静海面',text:'海风把浪尖抚平。今天，适合把家再建好一点。',weather:'晴',kind:'calm'},
    {id:'timber',name:'货船残骸',text:'破碎船板顺着洋流漂来。频道里木材供应充足，适合低价备货。',weather:'多云',kind:'abundance',market:'wood',price:0.55,boxes:1},
    {id:'rain',name:'温柔雨带',text:'雨水敲打甲板。你铺开容器，接住这场来自天空的补给。',weather:'小雨',kind:'rain',water:3},
    {id:'heat',name:'灼热日光',text:'海面亮得刺眼。今天需要更多饮水，淡水报价也在上涨。',weather:'炎热',kind:'heat',market:'water',price:1.7},
    {id:'cold',name:'冷流过境',text:'寒流裹着湿雾。保暖织物变得紧俏，有卧铺会好过很多。',weather:'寒冷',kind:'cold',market:'cloth',price:1.8},
    {id:'shoal',name:'银色鱼群',text:'鱼群在木筏旁划出银线，食物的报价暂时回落。',weather:'晴',kind:'food',market:'food',price:0.6,food:2},
    {id:'bloom',name:'荧光之夜',text:'昨夜海水泛起微光。你精神格外好，今天幸运临时 +8。',weather:'晴',kind:'lucky',luck:8},
    {id:'scrap',name:'金属漂流带',text:'旧货箱和铁皮顺流而下，频道里废铁交易变得便宜。',weather:'多云',kind:'abundance',market:'metal',price:0.6},
    {id:'fog',name:'雾中回声',text:'远处传来一声悠长汽笛。打捞数量略少，但隐藏发现概率提高。',weather:'海雾',kind:'mystery',boxes:-1,luck:10},
    {id:'turtle',name:'海龟同行',text:'一只海龟在木筏旁换气，带你发现一小片聚集的漂流物。',weather:'晴',kind:'gift',boxes:1},
    {id:'cloth',name:'散落的帆布',text:'大片帆布漂过海面。织布供应增加，可以考虑提前做保暖准备。',weather:'多云',kind:'abundance',market:'cloth',price:0.55},
    {id:'seed',name:'春潮来信',text:'一小包防水种子卡在甲板缝里，纸上写着：总会有发芽的一天。',weather:'晴',kind:'gift',seed:1},
    {id:'tailwind',name:'顺流航段',text:'洋流把木筏送向货物汇集处。今天可以多捞两个箱子。',weather:'顺风',kind:'abundance',boxes:2},
    {id:'radio',name:'公共救援广播',text:'频道里有人留下安全航段的信息。你整理装备，恢复了一些精神。',weather:'多云',kind:'rest',heal:6},
    {id:'wreck',name:'翻覆的浮桶',text:'被浪翻起的浮桶撞上木筏，里面封着意外留下的补给。',weather:'阴',kind:'gift',water:1,food:1},
    {id:'demand',name:'修缮潮',text:'不少幸存者正在修补基地，绳索的交换价值明显上涨。',weather:'多云',kind:'market',market:'rope',price:1.65},
    {id:'shell',name:'白贝海域',text:'白色贝壳点缀浪尖。开箱时更容易发现完整设备零件。',weather:'晴',kind:'lucky',quality:0.12},
    {id:'drizzle',name:'漫长细雨',text:'你在雨声里整理旧物。潮湿让人疲倦，但集雨器运转得很好。',weather:'细雨',kind:'rain',water:2},
    {id:'red',name:'赤色晚霞',text:'远方云层染红。你在日记上画了一条线：今天也活下来了。',weather:'晴',kind:'rest',heal:4},
    {id:'parts',name:'维修物资短缺',text:'频道里都在寻找精密零件。存货开始变得更有价值。',weather:'阴',kind:'market',market:'parts',price:1.7}
  ];
  D.explores = [
    {id:'boat',name:'倾斜的救生艇',text:'艇舱半浸在水里，卡住的门后传来金属轻响。',stat:'body',need:35,reward:{metal:6,parts:1,water:2},rare:{parts:2,map:1}},
    {id:'island',name:'退潮的无人岛',text:'礁石间露出一条小径。沙地上似乎有人留下过营地。',stat:'body',need:38,reward:{food:4,seed:2,wood:8},rare:{herb:2,map:1}},
    {id:'station',name:'漂流观测站',text:'浮台的指示灯仍在闪烁，残存的设备里藏着记录。',stat:'luck',need:38,reward:{parts:2,metal:5},rare:{crystal:1,map:1}},
    {id:'container',name:'半沉的集装箱',text:'箱门上的封条已经褪色。浪花不断灌入狭窄的入口。',stat:'body',need:45,reward:{wood:15,rope:5,cloth:4},rare:{parts:3,crystal:1}},
    {id:'reef',name:'发光的浅礁',text:'细小的光从礁石缝隙透出。海图在这里画着一枚圆点。',stat:'luck',need:42,reward:{herb:2,seed:2,metal:5},rare:{crystal:2,map:1}},
    {id:'garden',name:'海上的旧花园',text:'一座荒废平台上竟有植物。温室破碎，根系依然存活。',stat:'body',need:40,reward:{food:5,seed:3,cloth:3},rare:{seed:4,parts:2}},
    {id:'buoy',name:'失联的信号浮标',text:'浮标周期性亮起，微弱的电流似乎正在呼唤谁。',stat:'luck',need:45,reward:{parts:2,metal:8},rare:{map:2,crystal:1}},
    {id:'deep',name:'深蓝色沉船',text:'船体在水下若隐若现。你需要打捞钩才能触及核心舱。',stat:'body',need:55,hook:true,reward:{parts:4,metal:12},rare:{core:1,crystal:2}}
  ];
  D.storms = [null,{name:'阵风',wind:15,safety:10},{name:'强风浪',wind:30,safety:25},{name:'海上风暴',wind:50,safety:45},{name:'猛烈风暴',wind:70,safety:65},{name:'灾难风暴',wind:90,safety:85}];
  D.specials = [
    {id:'lighthouse',name:'不灭的灯塔',mark:'✦',intro:'“如果你听见了，请回答。灯塔需要重新亮起来。”',item:'parts',count:3,reward:'守夜灯',desc:'完成两次供给协助，获得守夜灯：防风、安全各 +10。'},
    {id:'gardener',name:'只剩半包种子',mark:'♧',intro:'“幼苗还活着。只要有水，我们就还有明年。”',item:'water',count:4,reward:'耐盐种子',desc:'完成两次供水，获得耐盐种子：每天额外产出3份口粮。'},
    {id:'dock',name:'第七码头',mark:'◇',intro:'“你也找到了那些残页？先别把它们交给系统。”',item:'metal',count:8,reward:'旧航路图',desc:'携带三张残页并完成两次协助，获得旧航路图：高品质箱概率 +10%。'}
  ];
  root.DriftData = D;
}(typeof window !== 'undefined' ? window : global));

