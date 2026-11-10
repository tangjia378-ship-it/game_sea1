(function(root){
  'use strict';
  const E=root.DriftEngine, prefix='floating-home-v1-', native=root.xhs&&root.xhs.miniTool;
  let backend='browser', revision=0, initialized=false;
  function hash(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return (h>>>0).toString(16);}
  function wrap(state,rev){const data=JSON.stringify(state);return JSON.stringify({revision:rev,checksum:hash(data),data:data});}
  function decode(raw){
    if(!raw)return null;
    try {const o=JSON.parse(raw);if(!Number.isSafeInteger(o.revision)||o.revision<1||typeof o.data!=='string'||hash(o.data)!==o.checksum)return false;
      const state=JSON.parse(o.data);return E.validate(state)?{revision:o.revision,state:state}:false;
    }catch(err){return false;}
  }
  function timeout(p){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('存档服务响应超时，请重试。')),7000);Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
  async function version(){
    const env=root.xhs&&root.xhs.launchOptions&&root.xhs.launchOptions.miniToolEnv;
    let build=Number(env&&env.buildVersion)||0;
    if(!build&&native&&typeof native.getLaunchOptions==='function'){try{const o=await timeout(native.getLaunchOptions());build=Number(o.miniToolEnv&&o.miniToolEnv.buildVersion)||0;}catch(err){build=0;}}
    return Math.floor(build/1000);
  }
  async function readSlot(i,where){
    if(where==='native'){const r=await timeout(native.getStorage({key:prefix+i}));return r.data;}
    return root.localStorage.getItem(prefix+i);
  }
  async function writeSlot(i,data){
    if(backend==='native'){await timeout(native.setStorage({key:prefix+i,data:data}));return;}
    root.localStorage.setItem(prefix+i,data);
    if(root.localStorage.getItem(prefix+i)!==data)throw new Error('存档未成功写入。');
  }
  async function readPair(where){
    const raws=await Promise.all([readSlot(0,where),readSlot(1,where)]);
    const decoded=raws.map(decode);const valid=decoded.filter(v=>v&&v!==false).sort((a,b)=>b.revision-a.revision);
    if(valid.length)return {best:valid[0],recovered:decoded.some(v=>v===false)};
    if(decoded.some(v=>v===false))throw new Error('已有存档无法完整读取。请保留现场，勿直接覆盖。');
    return {best:null,recovered:false};
  }
  const S={
    async load(){
      const ver=await version();backend=ver>=9460?'native':'browser';
      if(backend==='native'&&(!native||typeof native.getStorage!=='function'||typeof native.setStorage!=='function'))throw new Error('当前客户端存档接口不可用，请重新打开后重试。');
      const pair=await readPair(backend);let best=pair.best;
      if(!best&&backend==='native'){
        let old=null;try{old=await readPair('browser');}catch(err){old=null;}
        if(old&&old.best){revision=old.best.revision;await writeSlot((revision+1)%2,wrap(old.best.state,revision+1));revision++;best={state:old.best.state,revision:revision};}
      }
      revision=best?best.revision:0;initialized=true;
      return {state:best?best.state:null,recovered:pair.recovered,backend:backend};
    },
    async save(state){
      if(!initialized)throw new Error('存档尚未准备好，请先重试读取。');
      if(!E.validate(state))throw new Error('当前进度数据异常，已暂停写入。');
      const next=revision+1;await writeSlot(next%2,wrap(state,next));revision=next;
    },
    async layout(){
      if(!native||typeof native.getWindowInfo!=='function')return;
      if(await version()<9490)return;
      try{
        const info=await timeout(native.getWindowInfo());let top=info.safeArea?info.safeArea.top:0;
        const buttons=info.menuButtons||{};Object.keys(buttons).forEach(k=>{const b=buttons[k];if(b&&b.top<100)top=Math.max(top,b.bottom);});
        if(Number.isFinite(top))document.documentElement.style.setProperty('--host-top',(Math.max(0,top)+12)+'px');
      }catch(err){/* CSS safe-area fallback remains active. */}
    },
    backend(){return backend;},
    async resetAfterReadError(){initialized=true;revision=Date.now();}
  };
  root.DriftStorage=S;
}(typeof window!=='undefined'?window:global));
