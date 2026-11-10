(function(root){
  'use strict';
  const E=root.DriftEngine,D=root.DriftData,baseAct=E.act,baseCreate=E.create;
  function init(s){if(!s.journey)s.journey={claimed:[]};if(!s.today.review)s.today.review={};if(!Number.isInteger(s.completedExplorations))s.completedExplorations=0;return s;}
  D.routes=[
    {id:'supplies',name:'补给洋流',mark:'◒',desc:'每箱额外食物或饮水，适合稳定生存',effect:'补给 +1～2 / 箱'},
    {id:'materials',name:'残骸航道',mark:'▤',desc:'每箱额外木板与绳索，优先扩建家园',effect:'木板 +3、绳索 +1 / 箱'},
    {id:'treasure',name:'深蓝航线',mark:'✧',desc:'箱子数量 −1（至少2箱），更容易发现珍藏',effect:'品质判定 +18% · 数量 −1'}
  ];
  D.goals=[
    {id:'first',title:'第一份超常收获',desc:'完成一次开箱，证明系统真的选中了你。',hint:'先打捞，再打开箱子',check:s=>s.totalBoxes>0,reward:{rope:3,parts:1},label:'绳索 ×3、精密零件 ×1',target:'salvage'},
    {id:'home',title:'告别四面漏风的木排',desc:'升级为加固木筏，给自己留一块安心落脚的地方。',hint:'建成加固木筏',check:s=>s.level>=2,reward:{wood:10,cloth:3},label:'木板 ×10、织布 ×3',target:'upgrade'},
    {id:'water',title:'第一口安稳的水',desc:'建造集雨器，让明天的饮水自动送到船舱。',hint:'建造集雨器',check:s=>E.built(s,'rain'),reward:{seed:2,metal:4},label:'种子 ×2、废铁 ×4',target:'rain'},
    {id:'legacy',title:'第三日 · 漂流者的遗产',desc:'遗产箱的封印写着：活到第三日，让打捞网重新张开。',hint:'到达第3天，并建造扩展打捞网',check:s=>s.day>=3&&E.built(s,'net'),reward:{parts:3,crystal:1},label:'潮汐透镜：永久提高珍藏机会；零件 ×3、结晶 ×1',target:'net',relic:'lens'},
    {id:'signal',title:'是谁在呼唤你',desc:'遗产中的频率指向一座灯塔。修好接收器，听清那句话。',hint:'到达第5天，并修好接收器',check:s=>s.day>=5&&E.built(s,'radio'),reward:{parts:3,map:1},label:'航图残页 ×1、精密零件 ×3',target:'radio'},
    {id:'harbor',title:'海面上的第一盏灯',desc:'建成海上居所。今晚，你可以在自己的灯光下看海。',hint:'升级为海上居所（4级）',check:s=>s.level>=4,reward:{crystal:3,parts:5},label:'潮汐结晶 ×3、精密零件 ×5',target:'upgrade'}
  ];
  E.upgradeNeeds=function(s){
    init(s);if(s.level===2)return [{label:'建造集雨器',done:E.built(s,'rain'),target:'rain'},{label:'建造扩展打捞网',done:E.built(s,'net'),target:'net'}];
    if(s.level===3)return [{label:'修复接收器',done:E.built(s,'radio'),target:'radio'},{label:'完成一次探索',done:s.completedExplorations>=1,target:'explore'}];
    const count=Object.keys(s.specials).filter(k=>s.specials[k].complete).length;
    if(s.level===4)return [{label:'获得一位特殊人物的专属遗物',done:count>=1,target:'encounters'}];
    if(s.level===5)return [{label:'获得两位特殊人物的专属遗物',done:count>=2,target:'encounters'},{label:'建造深海打捞钩',done:E.built(s,'hook'),target:'hook'}];
    return [];
  };
  E.prepare=init;
  E.goal=s=>{init(s);return D.goals.find(g=>s.journey.claimed.indexOf(g.id)<0)||null;};
  E.create=function(power,seed){return init(baseCreate(power,seed));};
  E.act=function(s,type,args){
    init(s);const a=args||{};
    if(type==='review'){
      if(s.dead||s.today.settled||!s.today.opened)throw new Error('先完成当前的生存和开箱步骤。');
      if(['explore','trade','build'].indexOf(a.section)<0)throw new Error('未知的流程步骤。');
      s.today.review[a.section]=true;return s;
    }
    if(type==='claimGoal'){
      if(s.dead||s.today.settled)throw new Error('请在白天领取阶段奖励。');
      const g=E.goal(s);if(!g||g.id!==a.id||!g.check(s))throw new Error('目标尚未完成，或奖励已经领取。');
      Object.keys(g.reward).forEach(k=>s.bag[k]=(s.bag[k]||0)+g.reward[k]);if(g.relic)s.relics[g.relic]=true;
      s.journey.claimed.push(g.id);s.seq++;s.logs.push({id:s.seq,day:s.day,title:'阶段完成 · '+g.title,text:g.label,tone:'gold'});s.logs=s.logs.slice(-65);return s;
    }
    if(type==='route'){
      if(s.dead||s.today.settled||s.today.salvaged)throw new Error('今天的航线已经锁定。');
      if(!D.routes.some(r=>r.id===a.id))throw new Error('未知航线。');s.today.route=a.id;return s;
    }
    if(type==='build'&&a.id==='upgrade'){const missing=E.upgradeNeeds(s).filter(n=>!n.done);if(missing.length)throw new Error('先完成：'+missing.map(n=>n.label).join('、'));}
    baseAct(s,type,a);init(s);
    if(type==='trade'&&['accept','gift'].indexOf(a.kind)>=0)s.today.review.trade=true;
    if(type==='explore'){s.today.review.explore=true;if(a.method!=='skip')s.completedExplorations++;}
    if(type==='build')s.today.review.build=true;
    return s;
  };
  E.task=function(s){
    init(s);if(s.dead)return {panel:'rescue',title:'处理紧急援助',desc:'这次漂流还可以继续',stage:4};
    if(s.today.settled)return {panel:'dawn',title:'进入第'+(s.day+1)+'天',desc:'新的洋流与收获正在靠近',stage:5};
    if(!s.today.salvaged)return {panel:'salvage',title:'选择航线，开始打捞',desc:'决定今天要囤物资，还是追逐珍藏',stage:0};
    if(!s.today.opened)return {panel:'crates',title:s.today.choices?'选择天命奖励':'打开今天的箱子',desc:'收获会立即展示，系统收益单独标明',stage:1};
    const g=E.goal(s);if(g&&g.check(s))return {panel:'goal',title:'领取阶段奖励',desc:g.title,stage:3};
    if(s.power==='rewrite'&&s.today.rewritable&&!s.today.rewriteUsed)return {panel:'rewrite',title:'把危机改成奇遇',desc:'今天的命运改写可以使用',stage:2};
    if(s.explore&&!s.today.explored&&!s.today.review.explore)return {panel:'explore',title:'查看新发现的地点',desc:'探索，或明确选择留待明天',stage:2};
    if(s.day>=2&&!s.today.review.trade)return {panel:'trade',title:'处理今日交换',desc:'挑一笔有用的交易，也可以全部略过',stage:3};
    if(!s.today.review.build)return {panel:'build',title:g?'推进目标：'+g.title:'改善你的海上家园',desc:g?g.hint:'选择设施或留存物资，备好今晚的防护',stage:3};
    return {panel:'night',title:'检查准备，结束今天',desc:'带着今天的收获，看看明天会送来什么',stage:4};
  };
}(typeof window!=='undefined'?window:global));
