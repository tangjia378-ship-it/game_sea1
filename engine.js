(function (root) {
  'use strict';
  const D = root.DriftData;
  const E = {};
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function rand(s) { s.seed = (Math.imul(s.seed,1664525)+1013904223) >>> 0; return s.seed/4294967296; }
  function int(s,a,b) { return a+Math.floor(rand(s)*(b-a+1)); }
  function pick(s,a) { return a[int(s,0,a.length-1)]; }
  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function fail(message) { throw new Error(message); }
  function add(s,items) { Object.keys(items).forEach(k => { s.bag[k] = (s.bag[k]||0)+items[k]; }); }
  function has(s,cost) { return Object.keys(cost).every(k => (s.bag[k]||0)>=cost[k]); }
  function pay(s,cost) { if (!has(s,cost)) fail('物资不足，先看看还缺什么。'); Object.keys(cost).forEach(k => { s.bag[k]-=cost[k]; }); }
  function log(s,title,text,tone) { s.seq++; s.logs.push({id:s.seq,day:s.day,title:title,text:text,tone:tone||'plain'}); s.logs=s.logs.slice(-65); }
  function names(items) { return Object.keys(items).filter(k=>items[k]>0).map(k=>D.items[k].name+' ×'+items[k]).join('、'); }
  function built(s,id) { return s.facilities.some(f=>f.id===id); }
  function bonus(s,key) { let n=0; s.facilities.forEach(f=>{ const def=D.facilities.find(x=>x.id===f.id); n+=(def[key]||0)*(f.mode==='effect'?1.5:1); }); return n; }
  function stats(s) {
    const r=D.rafts[s.level-1]; const healthy=0.45+s.durability/100*0.55;
    return {comfort:Math.round(clamp(r.comfort+bonus(s,'comfort'),0,100)),
      safety:Math.round(clamp((r.safety+bonus(s,'safety')+(s.relics.lamp?10:0))*healthy,0,100)),
      wind:Math.round(clamp((r.wind+bonus(s,'wind')+(s.relics.lamp?10:0))*healthy,0,100)),
      used:s.facilities.reduce((n,f)=>n+(f.mode==='space'?0:D.facilities.find(x=>x.id===f.id).space),0),
      space:r.space+Math.floor(bonus(s,'extraSpace')), water:Math.floor(bonus(s,'water')),food:Math.floor(bonus(s,'food'))+(s.relics.seeds?3:0)};
  }
  function powerLimit(s) { return s.day>=15?2:1; }
  function buildCost(s,cost,system) {
    const c=copy(cost); if (system && s.power==='builder' && s.today.buildUses<powerLimit(s)) {
      Object.keys(c).forEach(k=>{ if (D.items[k].type==='材料') c[k]=Math.max(1,Math.ceil(c[k]*0.25)); });
    } return c;
  }
  function makePlans(s) {
    let last=s.plan.length?s.plan[s.plan.length-1].day:s.day-1;
    while(last<s.day+7) {
      last++;
      const recent=s.plan.slice(-4).map(p=>p.event);
      const candidates=D.events.filter(e=>recent.indexOf(e.id)<0);
      const event=last===1?'calm':pick(s,candidates).id;
      let storm=0;
      if (last===s.nextStorm) {
        const cap=Math.min(5,1+Math.floor(last/10));
        storm=last<10?2:int(s,Math.max(1,cap-1),Math.min(5,cap+1));
        s.nextStorm=last+int(s,6,10);
      }
      s.plan.push({day:last,event:event,storm:storm});
    }
    s.plan=s.plan.filter(p=>p.day>=s.day-4);
  }
  function current(s) { return s.plan.find(p=>p.day===s.day); }
  function event(s) { return D.events.find(e=>e.id===current(s).event); }
  function npc(s,forceNew) {
    if (!forceNew && s.npcs.length && rand(s)<0.72) {
      const total=s.npcs.reduce((a,n)=>a+12+n.affection,0); let r=rand(s)*total;
      for(let i=0;i<s.npcs.length;i++){ r-=12+s.npcs[i].affection; if(r<=0)return s.npcs[i]; }
    }
    if (s.npcs.length>=12) return pick(s,s.npcs);
    const prefixes=['囤罐头的','不想游泳的','晒太阳的','追着浪的','迷路的','捡贝壳的','爱喝热水的','住在海上的'];
    const suffixes=['海獭','水母','阿蓝','小满','船长','橘子','鲸鱼','小岛'];
    let name=pick(s,prefixes)+pick(s,suffixes); let tries=0;
    while(s.npcs.some(n=>n.name===name)&&tries++<80)name=pick(s,prefixes)+pick(s,suffixes);
    const n={id:'n'+(s.npcs.length+1),name:name,affection:0,temper:pick(s,['爽快','谨慎','念旧']),preference:pick(s,['wood','rope','metal','cloth','water','food']),trades:0};
    s.npcs.push(n); return n;
  }
  function value(s,k) { const e=event(s); return D.items[k].value*(e.market===k?e.price:1); }
  function makeOffers(s) {
    if(s.day<2)return [];
    const offers=[]; const keys=['wood','rope','metal','cloth','water','food'];
    for(let i=0;i<3;i++) {
      const person=npc(s,i===2 && s.npcs.length<5);
      const give=person.preference&&rand(s)<0.6?person.preference:pick(s,keys); let receive=pick(s,keys.filter(k=>k!==give));
      if(person.affection>=30 && rand(s)<0.45)receive=rand(s)<0.8?'parts':'crystal';
      const qty=receive==='parts'?int(s,1,2):receive==='crystal'?1:int(s,2,5);
      const discount=1.18-Math.min(0.3,person.affection/400);
      const ask=Math.max(1,Math.ceil(value(s,receive)*qty/value(s,give)*discount));
      offers.push({id:s.day+'-'+i,npc:person.id,give:give,giveQty:ask,receive:receive,receiveQty:qty,attempts:0,done:false,
        chance:clamp(0.45+person.affection/250+(person.temper==='爽快'?0.1:0),0.25,0.92)});
    }return offers;
  }
  function startDay(s) {
    makePlans(s); const e=event(s);
    s.today={salvaged:false,opened:false,crates:[],choices:null,explored:false,buildUses:0,rewriteUsed:false,rewritable:null,
      boosted:[],offers:[],boughtIntel:false,gathered:false,begged:false,listingMade:false,specialGiven:[],extraTrip:false};
    s.today.offers=makeOffers(s); s.energy=100;
    log(s,'第'+s.day+'天 · '+e.name,e.text,e.kind==='cold'||e.kind==='heat'?'amber':'teal');
    const p=stats(s); const income={}; if(p.water)income.water=p.water;if(p.food)income.food=p.food;
    if(e.water)income.water=(income.water||0)+e.water;
    if(e.food)income.food=(income.food||0)+e.food;
    if(e.seed)income.seed=e.seed;
    if(Object.keys(income).length){add(s,income);log(s,'今日自动收获',names(income),'green');}
    if(e.heal){s.hp=clamp(s.hp+e.heal,0,100);}
    if(s.day===15)log(s,'系统权限进化','你的开局能力已进化。能力卡上可以查看新的效果。','gold');
    if(s.listing && s.listing.status==='waiting' && s.day>s.listing.day){
      if(rand(s)<0.85 || s.day-s.listing.day>=2){s.listing.status='ready';log(s,'求购收到回应','有幸存者愿意按你的挂牌条件交换。到交易卡确认领取，或撤回物资。','violet');}
    }
    if(!s.explore && s.day>=s.nextExplore){
      const candidates=D.explores.filter(x=>s.exploreHistory.slice(-3).indexOf(x.id)<0 && (!x.hook||built(s,'hook')));
      const x=pick(s,candidates);s.explore={id:x.id,expires:s.day+2};s.exploreHistory.push(x.id);s.exploreHistory=s.exploreHistory.slice(-5);
      s.nextExplore=s.day+int(s,3,5);log(s,'发现探索地点',x.name+'将在附近停留至第'+s.explore.expires+'天。可准备后再去。','violet');
    }
    D.specials.forEach(sp=>{
      const unlock=sp.id==='lighthouse'?built(s,'radio'):sp.id==='gardener'?built(s,'garden'):(s.bag.map||0)>=3;
      if(unlock && !s.specials[sp.id]){s.specials[sp.id]={stage:0,lastDay:0,complete:false};log(s,'特殊信号 · '+sp.name,sp.intro,'gold');}
    });
    if(built(s,'radio')){s.intelUntil=Math.max(s.intelUntil,s.day+3);log(s,'接收器 · 免费天气情报',forecast(s,3),'teal');}
    if(s.npcs.some(n=>n.affection>=45) && rand(s)<0.35){s.intelUntil=Math.max(s.intelUntil,s.day+3);log(s,'熟人捎来的免费情报',forecast(s,3),'green');}
  }
  function forecast(s,range) {
    return s.plan.filter(p=>p.day>s.day&&p.day<=s.day+range).map(p=>'第'+p.day+'天：'+(p.storm?D.storms[p.storm].name+'；':'')+D.events.find(e=>e.id===p.event).name).join('；');
  }
  E.create=function(power,seed){
    if(!D.powers.some(p=>p.id===power))fail('请选择一种系统权限。');
    const s={version:1,seed:(seed>>>0)||92831,day:1,power:power,hp:100,hunger:85,thirst:85,body:30,luck:25,energy:100,
      level:1,durability:100,bag:{wood:8,rope:3,cloth:2,metal:2,water:3,food:3,herb:1,parts:0,seed:0,crystal:0,map:0,core:0},
      facilities:[],relics:{},npcs:[],specials:{},plan:[],nextStorm:0,nextExplore:3,explore:null,exploreHistory:[],
      intelUntil:0,listing:null,logs:[],seq:0,totalBoxes:0,pity:0,dead:false,rescues:0,chapter:0,recentEvents:[]};
    s.nextStorm=int(s,5,8);s.nextExplore=int(s,3,4);startDay(s);
    log(s,'欢迎来到浮海','四周只有海，但系统选中了你。先打捞今天的箱子，再把这块木排变成家。','gold');
    return s;
  };
  function crate(s,forced) {
    const e=event(s);const quality=bonus(s,'quality')+(e.quality||0)+(s.relics.chart?0.1:0)+(s.relics.lens?0.07:0)+(s.today.route==='treasure'?0.18:0)+(s.luck+(e.luck||0))/800;
    let roll=rand(s)+quality;let tier=roll>1.07?3:roll>0.76?2:roll>0.40?1:0;
    if(forced || s.pity>=9)tier=Math.max(2,tier);
    if(s.power==='destiny' && s.today.crates.length===0)tier=clamp(tier+(s.day>=15?2:1),2,3);
    if(built(s,'hook')&&rand(s)<0.10)tier=3;
    s.pity=tier>=2?0:s.pity+1;
    const loot={wood:int(s,2,4)+tier*2,rope:int(s,1,2)+tier};
    const supply=rand(s)<0.5?'food':'water';loot[supply]=int(s,1,2)+Math.floor(tier/2);
    if(tier>=1){loot.metal=int(s,1,3)+tier;loot.cloth=int(s,1,2);}
    if(tier>=2){loot.parts=int(s,1,2);if(rand(s)<0.5)loot.seed=1;}
    if(tier===3){loot.crystal=1;if(rand(s)<0.3)loot.map=1;}
    if(s.today.route==='materials'){loot.wood+=3;loot.rope+=1;}
    if(s.today.route==='supplies'){const key=rand(s)<0.5?'water':'food';loot[key]=(loot[key]||0)+int(s,1,2);}
    return {tier:tier,loot:loot};
  }
  function salvage(s) {
    if(s.today.salvaged)fail('今天的打捞已经完成。');
    s.today.salvaged=true;
    const count=clamp(int(s,2,5)+Math.floor(bonus(s,'boxes'))+(event(s).boxes||0)-(s.today.route==='treasure'?1:0),2,15);
    for(let i=0;i<count;i++)s.today.crates.push(crate(s,s.day===1&&i===0));
    if(s.power==='destiny')s.today.choices=[{name:'建设物资',items:{wood:18,rope:5,metal:4}},{name:'生存补给',items:{water:6,food:6,herb:2}},{name:'稀有设备',items:{parts:3,seed:2}}];
    if(s.power==='rewrite'&&s.day===1)s.today.rewritable={kind:'found',title:'被暗流卷走的密封箱'};
    log(s,'打捞完成 · '+count+'个箱子','普通箱批量开启，稀有收获会单独标记。'+(s.power==='multiply'?'选择一个箱子进行十倍增幅。':''),'teal');
  }
  function open(s,index) {
    if(!s.today.salvaged || s.today.opened)fail('当前没有待开启的箱子。');
    if(s.power==='destiny' && s.today.choices)fail('先选择今天的天命奖励。');
    if(s.power==='multiply' && (!Number.isInteger(index)||index<0||index>=s.today.crates.length))fail('请选择一个要增幅的箱子。');
    const total={};let rare=0;
    s.today.crates.forEach((c,i)=>{
      const boosted=s.power==='multiply' && (i===index || (s.day>=15 && i===(index+1)%s.today.crates.length));
      if(boosted)s.today.boosted.push(i);
      Object.keys(c.loot).forEach(k=>{const m=boosted&&D.items[k].type!=='剧情'?10:1;total[k]=(total[k]||0)+c.loot[k]*m;});
      if(c.tier>=2)rare++;
    });
    s.today.opened=true;add(s,total);const before=Math.floor(s.totalBoxes/20);s.totalBoxes+=s.today.crates.length;
    log(s,s.power==='multiply'?'十倍增幅 · 收获入库':'全部开箱 · 收获入库',names(total),rare?'gold':'green');
    s.today.lastLoot=total;
    if(Math.floor(s.totalBoxes/20)>before)s.luck=clamp(s.luck+1,0,100);
    if(s.power==='destiny' && Math.floor(s.totalBoxes/20)>before){const r={parts:3,crystal:1};add(s,r);log(s,'天命累计奖励',names(r),'violet');}
    if(rand(s)<0.20){s.intelUntil=Math.max(s.intelUntil,s.day+3);log(s,'箱内发现密封情报',forecast(s,3),'teal');}
    if(s.day>=8 && (s.bag.map||0)<3 && s.totalBoxes>=s.nextMap){s.bag.map++;s.nextMap=s.totalBoxes+int(s,10,18);log(s,'航图线索','箱底夹着一张编号残页。航图残页 +1。','violet');}
    if(!s.nextMap)s.nextMap=s.totalBoxes+10;
  }
  function build(s,id,mode) {
    const system=mode==='effect'||mode==='space';
    if(system && (s.power!=='builder'||s.today.buildUses>=powerLimit(s)))fail('今天的系统建造权限已用完。');
    if(id==='upgrade'){
      if(s.level>=6)fail('当前已达到最高家园等级。');
      const next=D.rafts[s.level];pay(s,buildCost(s,next.cost,system));s.level++;s.durability=100;
      if(system)s.today.buildUses++;
      log(s,'家园升级 · '+next.name,'空间与基础防护提升，耐久恢复至100。'+(system?'系统减免已生效；家园升级不附加设施强化。':''),'gold');return;
    }
    const f=D.facilities.find(x=>x.id===id);if(!f)fail('未知设施。');
    if(built(s,id))fail('该设施已经建成。');
    if(s.level<f.level)fail('先升级到'+D.rafts[f.level-1].name+'。');
    const p=stats(s);if(mode!=='space'&&p.used+f.space>p.space)fail('空间不足，先升级家园或扩展甲板。');
    pay(s,buildCost(s,f.cost,system));s.facilities.push({id:id,mode:system?mode:'normal'});
    if(system)s.today.buildUses++;
    log(s,'建成 · '+f.name,f.desc+(system?(mode==='space'?'。系统强化：不占空间。':'。系统强化：数值效果提高50%。'):''),'green');
    if(s.level>=4&&!s.chapter){s.chapter=1;add(s,{parts:4,crystal:1});log(s,'第一章 · 海面上的家','你终于有了一处能安心点灯的住所。获得精密零件 ×4、潮汐结晶 ×1。远方还有新的信号。','gold');}
  }
  function trade(s,id,kind){
    const o=s.today.offers.find(x=>x.id===id);if(!o||o.done)fail('这笔交换已经结束。');
    const n=s.npcs.find(x=>x.id===o.npc);
    if(kind==='skip'){o.done=true;return;}
    if(kind==='bargain'||kind==='raise'){
      if(o.attempts>=1)fail('这笔交易已经议价过一次，可以接受或放弃。');
      o.attempts++;
      if(rand(s)<o.chance){
        if(kind==='bargain')o.giveQty=Math.max(1,Math.floor(o.giveQty*0.75));else o.receiveQty+=Math.max(1,Math.floor(o.receiveQty*0.35));
        o.note='对方接受了你的还价。';log(s,'议价成功 · '+n.name,o.note,'green');
      }else{o.rejected=true;o.note='“这个价格已经很实在了。”对方保留原报价。';log(s,'议价未成',o.note,'plain');}return;
    }
    if(kind==='pressure'){
      if(!o.rejected||o.attempts!==1)fail('只有首次议价被拒绝后才能继续施压。');
      o.attempts=2;n.affection=clamp(n.affection-5,0,100);
      if(rand(s)<o.chance*0.4){o.giveQty=Math.max(1,o.giveQty-1);o.note='对方勉强同意，但这次施压让关系变差。';}
      else{o.done=true;o.note='对方撤回了交易。';}
      log(s,'强硬议价 · '+n.name,o.note+' 好感 -5（最低0）。','amber');return;
    }
    if(kind!=='accept'&&kind!=='gift')fail('未知的交易操作。');
    const payment={};payment[o.give]=o.giveQty+(kind==='gift'?1:0);pay(s,payment);
    const reward={};reward[o.receive]=o.receiveQty;add(s,reward);o.done=true;n.trades++;
    const gain=(n.trades<8?4:2)+(kind==='gift'?7:0);n.affection=clamp(n.affection+gain,0,100);
    log(s,'成交 · '+n.name,'交付'+names(payment)+'，获得'+names(reward)+'。好感 +'+gain+'。','green');
  }
  function explore(s,method){
    if(!s.explore || s.today.explored)fail('当前没有可进行的探索。');
    const def=D.explores.find(x=>x.id===s.explore.id);
    if(method==='skip'){log(s,'暂别 · '+def.name,'你记下了这里的坐标，选择继续漂流。');s.explore=null;return;}
    if(s.energy<25)fail('体力不足，需要休息。');
    let score=def.stat==='body'?s.body:s.luck+(event(s).luck||0);let extra=0;
    if(method==='tool'){if(!built(s,'hook'))fail('需要先建造深海打捞钩。');extra=35;}
    if(method==='intel'){if(!(s.bag.map>0||s.intelUntil>=s.day))fail('需要航图残页或有效情报。');extra=22;}
    if(method==='system'){if(s.power!=='builder')fail('该选项需要神级建造权限。');extra=45;}
    if(['safe','bold','tool','intel','system'].indexOf(method)<0)fail('未知探索方式。');
    s.today.explored=true;s.energy-=25;
    score+=extra+(built(s,'hook')?12:0)-Math.max(0,60-s.hp)/2-(s.hunger<25?12:0)-(s.thirst<25?12:0);
    const result=score+int(s,0,35)-def.need;
    let reward=copy(def.reward),label='探索成功';
    if(method==='safe'){Object.keys(reward).forEach(k=>reward[k]=Math.max(1,Math.floor(reward[k]*0.45)));label='外围搜集';}
    else if(result>=18){Object.keys(def.rare).forEach(k=>reward[k]=(reward[k]||0)+def.rare[k]);label='探索大成功';s.body=clamp(s.body+1,0,100);}
    else if(result<0){Object.keys(reward).forEach(k=>reward[k]=Math.max(1,Math.floor(reward[k]*0.6)));s.hp=clamp(s.hp-10,0,100);label='探索受挫';s.today.rewritable={kind:'explore',title:def.name,reward:copy(def.rare)};}
    add(s,reward);log(s,label+' · '+def.name,'判定依据：'+(def.stat==='body'?'体质':'幸运')+'，装备与情报加成 '+extra+'。'+names(reward)+(label==='探索受挫'?'；生命 -10。':''),label==='探索大成功'?'gold':label==='探索受挫'?'amber':'green');
    s.explore=null;
  }
  function rewrite(s){
    if(s.power!=='rewrite'||s.today.rewriteUsed||!s.today.rewritable)fail('当前没有可改写的事件，或今日权限已用完。');
    const r=s.today.rewritable;s.today.rewriteUsed=true;s.today.rewritable=null;
    let reward=r.reward||{wood:12,parts:2,water:3};
    if(r.kind==='explore')s.hp=clamp(s.hp+10,0,100);
    if(r.kind==='storm'){s.durability=clamp(s.durability+r.damage,0,100);s.hp=clamp(s.hp+r.hurt,0,100);if(r.lost)add(s,r.lost);}
    add(s,reward);if(s.day>=15)add(s,{crystal:1});
    log(s,'命运改写 · '+r.title,'坏结局被划去，新的机遇浮出水面。获得'+names(reward)+(s.day>=15?'、潮汐结晶 ×1':''),'gold');
  }
  function special(s,id){
    const def=D.specials.find(x=>x.id===id),q=s.specials[id];
    if(!def||!q||q.complete||q.lastDay===s.day)fail('今天没有新的委托可交付。');
    const cost={};cost[def.item]=def.count;pay(s,cost);q.stage++;q.lastDay=s.day;
    log(s,'回应 · '+def.name,'交付'+names(cost)+'。'+(q.stage===1?'“收到了。等明天，我会再联系你。”':'“谢谢你，留着它，它会帮到你。”'),'violet');
    if(q.stage>=2){q.complete=true;s.relics[id==='lighthouse'?'lamp':id==='gardener'?'seeds':'chart']=true;
      log(s,'专属奖励 · '+def.reward,def.desc.split('：')[1],'gold');}
  }
  function nightPreview(s){
    const p=current(s),st=stats(s),threat=p.storm?D.storms[p.storm]:null;
    const deficits=threat?Math.max(0,threat.wind-st.wind)+Math.max(0,threat.safety-st.safety):0;
    const damage=threat?Math.min(55,Math.ceil(deficits*0.42)):0;
    const cold=event(s).kind==='cold'&&!built(s,'bed')?5:0;
    return {foodNeed:2,waterNeed:event(s).kind==='heat'?3:2,foodUse:Math.min(2,s.bag.food||0),waterUse:Math.min(event(s).kind==='heat'?3:2,s.bag.water||0),damage:damage,cold:cold,threat:threat,stats:st};
  }
  function settle(s){
    if(!s.today.opened)fail('先完成今天的打捞和开箱。');
    const n=nightPreview(s);
    s.bag.food-=n.foodUse;s.bag.water-=n.waterUse;
    s.hunger=clamp(s.hunger-24+n.foodUse*15,0,100);s.thirst=clamp(s.thirst-n.waterNeed*12+n.waterUse*16,0,100);
    let hurt=(s.hunger<15?15:0)+(s.thirst<15?20:0)+n.cold;
    const damage=n.damage;
    if(n.threat){
      s.durability=clamp(s.durability-damage,0,100);
      const stormHurt=damage>=25?Math.ceil(damage/4):0;hurt+=stormHurt;
      const lost={};if(damage>15){const key=pick(s,['wood','rope','cloth']);const count=Math.min(s.bag[key]||0,Math.ceil(damage/(built(s,'locker')?10:5)));if(count){lost[key]=count;s.bag[key]-=count;}}
      if(damage>0){s.today.rewritable={kind:'storm',title:n.threat.name,damage:damage,hurt:stormHurt,lost:lost,reward:{parts:3,wood:15}};}
      log(s,'风暴结算 · '+n.threat.name,damage?'耐久 -'+damage+(stormHurt?'，生命 -'+stormHurt:'')+(Object.keys(lost).length?'，损失'+names(lost):'')+'。':'防风、安全检查通过。你的家平稳度过了这一夜。',damage?'amber':'green');
    }
    const recovery=hurt===0&&s.hunger>=40&&s.thirst>=40?3+Math.floor(n.stats.comfort/12):0;
    s.hp=clamp(s.hp-hurt+recovery,0,100);
    log(s,'夜间结算','消耗'+n.foodUse+'份口粮、'+n.waterUse+'份淡水。'+(recovery?'生命恢复 '+recovery+'。':'')+(hurt?'总生命损失 '+hurt+'。':''),'plain');
    s.today.settled=true;s.dead=s.hp<=0||s.durability<=0;
  }
  E.act=function(s,type,payload){
    const a=payload||{};
    if(s.dead && ['rescue','rewrite'].indexOf(type)<0)fail('请选择接受救援或重新开局。');
    if(s.today.settled && ['next','rescue','rewrite'].indexOf(type)<0)fail('今天已经结算，请进入下一天。');
    switch(type){
      case 'salvage':salvage(s);break;
      case 'choice':
        if(!s.today.choices||!s.today.choices[a.index])fail('这份奖励已经领取。');
        add(s,s.today.choices[a.index].items);log(s,'天命之选',names(s.today.choices[a.index].items),'violet');s.today.choices=null;break;
      case 'open':open(s,a.index);break;
      case 'build':build(s,a.id,a.mode);break;
      case 'trade':trade(s,a.id,a.kind);break;
      case 'explore':explore(s,a.method);break;
      case 'rewrite':rewrite(s);s.dead=s.hp<=0||s.durability<=0;break;
      case 'special':special(s,a.id);break;
      case 'intel':
        if(s.today.boughtIntel||s.intelUntil>=s.day+3)fail('你已经掌握这段时间的情报。');
        pay(s,{cloth:1});s.today.boughtIntel=true;s.intelUntil=s.day+3;log(s,'可靠情报 · 未来三天',forecast(s,3),'teal');break;
      case 'gather':
        if(s.today.gathered)fail('今天的应急搜集已经完成。');s.today.gathered=true;
        add(s,{water:1,food:1,wood:2});s.energy=Math.max(0,s.energy-15);log(s,'应急搜集','淡水 ×1、口粮 ×1、木板 ×2。体力 -15。','green');break;
      case 'use':{
        const k=a.item;if(['water','food','herb'].indexOf(k)<0)fail('这件物品不能直接使用。');const c={};c[k]=1;pay(s,c);
        if(k==='water')s.thirst=clamp(s.thirst+25,0,100);if(k==='food')s.hunger=clamp(s.hunger+25,0,100);if(k==='herb')s.hp=clamp(s.hp+25,0,100);log(s,'使用'+D.items[k].name,'消耗1份，状态已恢复。','green');break;}
      case 'repair':
        if(s.durability>=100)fail('木筏耐久已满。');pay(s,{wood:3,rope:1});s.durability=clamp(s.durability+30,0,100);log(s,'修复木筏','耐久 +30，消耗木板 ×3、绳索 ×1。','green');break;
      case 'train':
        if(s.today.trained)fail('今天已经锻炼过了。');if(s.energy<20)fail('体力不足。');s.today.trained=true;s.energy-=20;s.body=clamp(s.body+2,0,100);log(s,'甲板锻炼','体质 +2，体力 -20。','green');break;
      case 'listing':{
        if(s.listing||s.today.listingMade)fail('同一时间只保留一笔求购，每天最多发布一次。');
        const presets=[{give:'wood',giveQty:8,receive:'water',receiveQty:3},{give:'wood',giveQty:10,receive:'rope',receiveQty:4},{give:'metal',giveQty:8,receive:'parts',receiveQty:1}];
        const p=presets[a.index];if(!p)fail('无效求购。');const c={};c[p.give]=p.giveQty;pay(s,c);
        s.listing=Object.assign({day:s.day,status:'waiting'},p);s.today.listingMade=true;log(s,'求购已发布','托管'+names(c)+'。次日起有机会收到回应，撤回会退还托管物资。','teal');break;}
      case 'collectListing':{
        if(!s.listing||s.listing.status!=='ready')fail('尚未收到回应。');const r={};r[s.listing.receive]=s.listing.receiveQty;add(s,r);s.listing=null;log(s,'求购成交',names(r),'green');break;}
      case 'cancelListing':{
        if(!s.listing)fail('没有待处理求购。');const r={};r[s.listing.give]=s.listing.giveQty;add(s,r);s.listing=null;log(s,'求购撤回','托管物资已退回。');break;}
      case 'settle':settle(s);break;
      case 'next':
        if(!s.today.settled)fail('先完成今天的结算。');
        s.day++;if(s.explore&&s.explore.expires<s.day){log(s,'探索地点远去','洋流改变了方向。之后还会遇到其他机会。');s.explore=null;}
        startDay(s);break;
      case 'rescue':{
        if(!s.dead)fail('当前无需救援。');
        const lost={};['wood','rope','metal','cloth'].forEach(k=>{const n=Math.floor((s.bag[k]||0)*0.25);s.bag[k]-=n;lost[k]=n;});
        s.hp=65;s.hunger=65;s.thirst=65;s.durability=65;s.rescues++;s.dead=false;
        log(s,'系统救援','普通建材损失25%，生命与耐久恢复到65。设施、稀有物品、人物关系保留。损失：'+(names(lost)||'无'),'amber');break;}
      default:fail('未知操作。');
    }
    s.dead=s.hp<=0||s.durability<=0;
    return s;
  };
  E.stats=stats;E.has=has;E.names=names;E.buildCost=buildCost;E.current=current;E.event=event;E.forecast=forecast;E.nightPreview=nightPreview;E.built=built;E.powerLimit=powerLimit;E.copy=copy;
  E.validate=function(s){
    if(!s||s.version!==1||!Number.isInteger(s.day)||s.day<1||!D.powers.some(p=>p.id===s.power))return false;
    if(!s.bag||!s.today||!Array.isArray(s.plan)||!Array.isArray(s.facilities)||!Array.isArray(s.npcs)||!Array.isArray(s.logs)||!s.specials||!s.relics)return false;
    if(!Number.isInteger(s.level)||s.level<1||s.level>6||!Number.isFinite(s.seed)||!s.plan.some(p=>p.day===s.day))return false;
    const nums=['hp','hunger','thirst','body','luck','energy','durability'];
    if(!nums.every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=100))return false;
    if(!Object.keys(D.items).every(k=>s.bag[k]===undefined||(Number.isFinite(s.bag[k])&&s.bag[k]>=0)))return false;
    if(!s.facilities.every(f=>D.facilities.some(x=>x.id===f.id))||!s.plan.every(p=>D.events.some(e=>e.id===p.event)&&p.storm>=0&&p.storm<=5))return false;
    return true;
  };
  root.DriftEngine=E;
}(typeof window !== 'undefined' ? window : global));

