/* Задачі підприємства — ядро застосунку.
   Сховище й вхід приходять ззовні через об'єкт fb (див. index.html): так ядро не залежить від Firebase напряму. */
window.startApp=function(fb){
  const ROLES={
    director:{name:"Директор",desc:"Усі задачі, плани, розподіл і паролі",title:"Задачі та плани підприємства",
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>'},
    vyrobnytstvo:{name:"Виробництво",desc:"Задачі цеху, статуси та звіти",title:"Задачі виробництва",
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>'},
    administratsiia:{name:"Адміністрація",desc:"Задачі офісу та адміністрації",title:"Задачі адміністрації",
      icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>'}
  };
  const EMAIL=fb.emails;
  const roleByEmail=e=>Object.keys(EMAIL).find(k=>EMAIL[k]===String(e||"").toLowerCase())||null;
  const DEPTS=[{id:"vyrobnytstvo",name:"Виробництво"},{id:"administratsiia",name:"Адміністрація"}];
  const ROLE_DEPTS={director:DEPTS.map(d=>d.id),vyrobnytstvo:["vyrobnytstvo"],administratsiia:["administratsiia"]};
  const DEFAULT_POS={
    vyrobnytstvo:["Начальник виробництва","Головний інженер","Технолог","Майстер дільниці","Головний механік","ВТК / контролер","Постачальник","Комірник","Інженер з охорони праці","Оператор верстата з ЧПК"],
    administratsiia:["Головний бухгалтер","Бухгалтер","Бухгалтер-експерт","Менеджер з продажу","Економіст","Юрист","Офіс-менеджер","HR-менеджер","Логіст"]
  };
  const deptName=id=>(DEPTS.find(d=>d.id===id)||{}).name||id;
  const STATUSES=[{id:"todo",name:"Не розпочато"},{id:"doing",name:"В роботі"},{id:"done",name:"Виконано"},{id:"issue",name:"Проблема"}];
  const PRIOS={high:"Високий",med:"Середній",low:"Низький"};
  const PRIO_RANK={high:0,med:1,low:2};
  const BLOCK_ORDER=["Планування","Виробництво","Технологія","Якість","Обладнання","Постачання і склад","Персонал","Охорона праці","Управління"];
  const MIN_PW=10, ITER=310000;

  const $=s=>document.querySelector(s);
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const today=(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})();
  const fmtDate=s=>{if(!s)return"";const [y,m,d]=s.split("-");return d+"."+m+"."+y};
  const fmtStamp=s=>{if(!s)return"";const d=new Date(s);if(isNaN(d))return"";return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
  const stName=id=>(STATUSES.find(s=>s.id===id)||STATUSES[0]).name;
  const uid=()=>"a"+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
  const personLabel=a=>(a.position||"")+(a.name?(a.position?" · ":"")+a.name:"")||"Без імені";
  const ENTRY_TYPES=[{id:"report",name:"Звіт про виконання"},{id:"info",name:"Інформація"},{id:"question",name:"Питання до директора"},{id:"issue",name:"Проблема"},{id:"idea",name:"Пропозиція"}];
  const typeName=id=>(ENTRY_TYPES.find(x=>x.id===id)||ENTRY_TYPES[0]).name;
  const PROGRESS=[0,10,25,50,75,90,100];
  const roleName=r=>(ROLES[r]||{}).name||"";

  /* styles for the task card and report history (kept here so an update touches one file) */
  (function(){
    if(document.getElementById("zv-v2"))return;
    const st=document.createElement("style");st.id="zv-v2";
    st.textContent=`
tr.row{cursor:pointer}
tr.row:focus-visible td{outline:none;background:color-mix(in srgb,var(--accent-soft) 55%,transparent)}
.title-btn.big{font-size:14.5px;display:inline-flex;gap:6px;align-items:flex-start}
.title-btn.big svg{width:14px;height:14px;flex:none;margin-top:4px;opacity:.55}
.open-hint{display:block;font-size:12px;color:var(--accent);font-weight:600;margin-top:4px}
.asg-last{font-size:13px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.prog-wrap{display:flex;align-items:center;gap:8px}
.prog{flex:1;max-width:160px;height:6px;border-radius:999px;background:var(--todo-bg);overflow:hidden}
.prog span{display:block;height:100%;background:var(--accent)}
.prog-l{font-family:var(--font-mono);font-size:12px;color:var(--muted)}
.etype{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.02em;border-radius:4px;padding:1px 7px;white-space:nowrap;vertical-align:1px}
.et-report{background:var(--done-bg);color:var(--done)}
.et-info{background:var(--accent-soft);color:var(--accent)}
.et-question{background:var(--doing-bg);color:var(--doing)}
.et-issue{background:var(--issue-bg);color:var(--issue)}
.et-idea{background:var(--todo-bg);color:var(--todo)}
.rep{gap:12px}
.rep.mine{border-color:var(--accent);background:var(--surface)}
.mine-tag{font-size:11.5px;font-weight:700;color:var(--accent);background:var(--accent-soft);border-radius:4px;padding:1px 8px}
.rep-ctrl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.rep-ctrl select.pill{width:100%;padding:8px 26px 8px 10px;border-radius:8px;font-size:13.5px}
.rep-new{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:12px}
.rep-new-row{display:flex;gap:8px;flex-wrap:wrap}
.rep-new-row select{flex:0 1 240px}
.rep-new textarea{width:100%;min-height:84px;resize:vertical;line-height:1.45}
.rep-ro{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto}
.hist li{border-left:3px solid var(--line-strong);padding:4px 0 4px 10px}
.hist-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.hist-t{white-space:pre-wrap;font-size:13.5px;line-height:1.5;margin-top:3px}
@media (max-width:600px){
  dialog{width:100vw;max-width:100vw;height:100%;max-height:100%;margin:0;border-radius:0;border:0}
  .rep-ctrl{grid-template-columns:1fr 1fr}
  .rep-ctrl .fl:first-child{grid-column:1/-1}
}`;
    document.head.appendChild(st);
  })();

  /* ---------- crypto ---------- */
  const TE=new TextEncoder(), TD=new TextDecoder();
  function b64(buf){const a=new Uint8Array(buf);let s="";for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
  function unb64(s){const bin=atob(s);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}
  async function deriveKek(pw,saltB64,iter){
    const base=await crypto.subtle.importKey("raw",TE.encode(pw),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt:unb64(saltB64),iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  async function seal(key,bytes){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,bytes);return{iv:b64(iv),ct:b64(ct)}}
  async function open(key,box){return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(box.iv)},key,unb64(box.ct)))}
  const importDK=raw=>crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
  const sealObj=(key,obj)=>seal(key,TE.encode(JSON.stringify(obj)));
  const boxCache=new Map(), tkCache=new Map();
  async function openObj(key,box){
    if(!box||!box.ct)return null;
    const c=boxCache.get(box.ct);if(c)return c;
    try{const o=JSON.parse(TD.decode(await open(key,box)));boxCache.set(box.ct,o);return o}catch(e){return null}
  }

  /* ---------- state ---------- */
  let vault=null, role=null, keys={}, rawKeys={}, sessionRev=0;
  let tasks=[], plans={}, staff={}, loaded=false;
  let unsubs=[], snapSeq=0, unsubVault=null;
  let loggingIn=false, pendingPw=null, pendingRemember=false;
  const ui={dept:"all",view:"table",q:"",block:"",owner:"",prio:"",status:""};
  try{const s=JSON.parse(localStorage.getItem("zv-ui")||"{}");if(s.view)ui.view=s.view;}catch(e){}
  const saveUi=()=>{try{localStorage.setItem("zv-ui",JSON.stringify({view:ui.view}))}catch(e){}};
  const isDir=()=>role==="director";
  const canEditAll=()=>isDir();
  const canRep=(t,a)=>!!a&&(isDir()||a.dept===role);

  let tt;
  function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2800)}
  function show(id){["#loginScreen","#setupScreen","#app"].forEach(s=>$(s).hidden=(s!==id))}

  /* ---------- session: keys stay on this device ---------- */
  function readSession(){
    for(const st of ["sessionStorage","localStorage"]){try{const v=window[st].getItem("zv-session");if(v)return JSON.parse(v)}catch(e){}}
    return null;
  }
  function writeSession(remember){
    sessionRev=(vault.rev||{})[role]||0;
    const s={role,rev:sessionRev,keys:{}};
    Object.keys(rawKeys).forEach(d=>s.keys[d]=b64(rawKeys[d]));
    const str=JSON.stringify(s);
    try{sessionStorage.setItem("zv-session",str)}catch(e){}
    try{if(remember)localStorage.setItem("zv-session",str);else localStorage.removeItem("zv-session")}catch(e){}
  }
  function clearSession(){try{sessionStorage.removeItem("zv-session")}catch(e){}try{localStorage.removeItem("zv-session")}catch(e){}}
  async function restoreSession(s){
    try{
      const rk={},k={};
      for(const d of ROLE_DEPTS[s.role]){if(!s.keys||!s.keys[d])return false;rk[d]=unb64(s.keys[d]);k[d]=await importDK(rk[d])}
      rawKeys=rk;keys=k;return true;
    }catch(e){return false}
  }
  function authMsg(e){
    const c=(e&&e.code)||"";
    if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c))return"Невірний пароль.";
    if(/too-many-requests/.test(c))return"Забагато спроб. Зачекайте кілька хвилин і спробуйте знову.";
    if(/network/.test(c))return"Немає з'єднання з інтернетом.";
    if(/user-disabled/.test(c))return"Цей розділ вимкнено в налаштуваннях Firebase.";
    if(/weak-password/.test(c))return"Пароль занадто простий.";
    if(/requires-recent-login/.test(c))return"Увійдіть знову й повторіть.";
    return"Помилка входу"+(c?" ("+c+")":"")+".";
  }

  /* ---------- login ---------- */
  let pickRole=null;
  $("#roleTiles").innerHTML=Object.keys(ROLES).map(k=>`<button type="button" class="role" data-role="${k}" aria-pressed="false"><span class="ic">${ROLES[k].icon}</span><b>${ROLES[k].name}</b><span>${ROLES[k].desc}</span></button>`).join("");
  $("#roleTiles").addEventListener("click",e=>{
    const b=e.target.closest("[data-role]");if(!b)return;
    pickRole=b.dataset.role;
    document.querySelectorAll(".role").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    $("#pwLabel").textContent="Пароль розділу «"+ROLES[pickRole].name+"»";
    $("#pw").disabled=false;$("#pw").placeholder="Введіть пароль";$("#pw").value="";$("#loginErr").textContent="";
    $("#loginBtn").disabled=false;$("#pw").focus();
  });
  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!pickRole||loggingIn)return;
    const pw=$("#pw").value;
    if(!pw){$("#loginErr").textContent="Введіть пароль.";return}
    loggingIn=true;$("#loginBtn").disabled=true;$("#loginBtn").textContent="Перевірка…";$("#loginErr").textContent="";
    const remember=$("#remember").checked;
    try{
      await fb.signIn(EMAIL[pickRole],pw,remember);
      const v=await fb.get("settings/vault");
      if(!v){
        if(pickRole==="director"){pendingPw=pw;pendingRemember=remember;show("#setupScreen");$("#sV").focus()}
        else{await fb.signOut();$("#loginErr").textContent="Директор ще не завершив перше налаштування."}
        return;
      }
      vault=v;
      const kek=await deriveKek(pw,vault.salts[pickRole],vault.iter);
      const wr=vault.wrapped[pickRole]||{};
      const rk={},k={};
      try{for(const d of ROLE_DEPTS[pickRole]){rk[d]=await open(kek,wr[d]);k[d]=await importDK(rk[d])}}
      catch(err){await fb.signOut();$("#loginErr").textContent="Пароль прийнято сервером, але ключ шифрування не підходить. Зверніться до директора.";return}
      rawKeys=rk;keys=k;role=pickRole;
      writeSession(remember);
      enter();
    }catch(err){
      $("#loginErr").textContent=authMsg(err);
    }finally{
      loggingIn=false;$("#loginBtn").disabled=false;$("#loginBtn").textContent="Увійти";$("#pw").value="";
    }
  });

  /* ---------- first-time setup (director, once) ---------- */
  $("#setupForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const pv=$("#sV").value, pa=$("#sA").value, err=$("#setupErr"), btn=$("#setupBtn");
    err.textContent="";
    if(!pendingPw){err.textContent="Увійдіть як директор ще раз.";return}
    if(!pv||!pa){err.textContent="Введіть обидва паролі.";return}
    btn.disabled=true;btn.textContent="Налаштування…";
    try{
      for(const [r,p] of [["vyrobnytstvo",pv],["administratsiia",pa]]){
        try{await fb.verifyPassword(EMAIL[r],p)}catch(ex){throw new Error("Пароль розділу «"+ROLES[r].name+"» не підходить: "+authMsg(ex))}
      }
      const pws={director:pendingPw,vyrobnytstvo:pv,administratsiia:pa};
      const rk={};DEPTS.forEach(d=>rk[d.id]=crypto.getRandomValues(new Uint8Array(32)));
      const salts={},wrapped={};
      for(const r of Object.keys(pws)){
        salts[r]=b64(crypto.getRandomValues(new Uint8Array(16)));
        const kek=await deriveKek(pws[r],salts[r],ITER);
        wrapped[r]={};
        for(const d of ROLE_DEPTS[r])wrapped[r][d]=await seal(kek,rk[d]);
      }
      const v={v:1,iter:ITER,salts,wrapped,rev:{director:0,vyrobnytstvo:0,administratsiia:0},isDefault:{director:false,vyrobnytstvo:false,administratsiia:false},changedAt:{},createdAt:new Date().toISOString()};
      await fb.set("settings/vault",v);
      vault=v;rawKeys=rk;keys={};for(const d of Object.keys(rk))keys[d]=await importDK(rk[d]);
      role="director";writeSession(pendingRemember);
      if($("#sSeed").checked&&Array.isArray(window.SEED_TASKS)){
        btn.textContent="Додаю задачі…";
        let n=0;
        for(const s of window.SEED_TASKS){
          n++;
          const t={id:fb.newId("tasks"),n,primary:s.dept,title:s.title,block:s.block,due:s.due||"",prio:s.prio||"med",repeat:s.repeat||"",comment:"",coreStatus:"todo",
            assignees:s.owner?[{id:uid(),dept:s.dept,position:s.owner,name:""}]:[],reps:{},depts:[],tk:null,tkRaw:null};
          stamp(t);await writeCore(t,true);
        }
      }
      pendingPw=null;
      enter();
      toast("Налаштування завершено");
    }catch(ex){err.textContent=ex.message||authMsg(ex)}
    btn.disabled=false;btn.textContent="Завершити налаштування";
  });
  $("#setupCancel").addEventListener("click",async()=>{pendingPw=null;await fb.signOut();show("#loginScreen")});

  function enter(){
    ui.dept=isDir()?"all":role; ui.q=ui.block=ui.owner=ui.prio=ui.status=""; $("#q").value="";
    show("#app");
    $("#whoBadge").textContent=ROLES[role].name;
    $("#appTitle").textContent=ROLES[role].title;
    $("#depts").hidden=!isDir();
    $("#settingsBtn").hidden=!isDir();
    $("#footNote").textContent=isDir()
      ?"Ви ставите задачі, призначаєте відповідальних з будь-якого підрозділу, задаєте терміни, плани та паролі. Кожен відповідальний пише свій звіт. Дані зашифровані."
      :"Ви бачите задачі, де є відповідальні з вашого підрозділу. Оновлюйте свій статус і пишіть звіт; звіти інших учасників задачі видно тут же.";
    if(!unsubVault)unsubVault=fb.watchDoc("settings/vault",v=>{if(!v||!role)return;vault=v;onVault()},()=>{});
    subscribeData();
    render(true);
  }
  async function logout(msg){
    role=null;keys={};rawKeys={};vault=null;
    clearSession();
    unsubs.forEach(u=>{try{u()}catch(e){}});unsubs=[];
    if(unsubVault){try{unsubVault()}catch(e){}unsubVault=null}
    tasks=[];plans={};staff={};loaded=false;boxCache.clear();tkCache.clear();
    closeAll();
    try{await fb.signOut()}catch(e){}
    show("#loginScreen");
    $("#view").innerHTML="";$("#plans").innerHTML="";$("#summary").innerHTML="";$("#director").innerHTML="";
    $("#loginErr").textContent=msg||"";
  }
  $("#logoutBtn").addEventListener("click",()=>logout(""));
  function closeAll(){[$("#dlg"),$("#pwDlg")].forEach(d=>{try{d.close()}catch(e){d.removeAttribute("open")}})}
  function onVault(){
    if(((vault.rev||{})[role]||0)!==sessionRev){logout("Пароль розділу змінено. Увійдіть з новим паролем.");return}
    renderBanner();
    if($("#pwDlg").open)renderPwSet();
  }

  /* restore a remembered session after reload */
  fb.onAuth(async email=>{
    if(loggingIn||role||!email)return;
    const r=roleByEmail(email), s=readSession();
    if(r&&s&&s.role===r){
      try{
        const v=await fb.get("settings/vault");
        if(v&&((v.rev||{})[r]||0)===s.rev&&await restoreSession(s)){vault=v;role=r;sessionRev=s.rev;enter();return}
      }catch(e){}
    }
    if(!loggingIn&&!role&&$("#setupScreen").hidden){clearSession();try{await fb.signOut()}catch(e){}}
  });

  /* ---------- task model (encrypted) ---------- */
  async function getTK(doc){
    for(const d of doc.depts||[]){
      if(!keys[d]||!doc.wk||!doc.wk[d])continue;
      const c=tkCache.get(doc.wk[d].ct);if(c)return c;
      try{const raw=await open(keys[d],doc.wk[d]);const v={tk:await importDK(raw),raw};tkCache.set(doc.wk[d].ct,v);return v}catch(e){}
    }
    return null;
  }
  function mk(id,meta,core,reps,k){
    return {id,n:meta.n||0,depts:meta.depts||[],primary:core.primary||(meta.depts||[])[0]||"vyrobnytstvo",
      title:core.title||"",block:core.block||"",due:core.due||"",prio:core.prio||"med",repeat:core.repeat||"",comment:core.comment||"",
      coreStatus:core.status||"todo",assignees:Array.isArray(core.assignees)?core.assignees:[],reps:reps||{},
      tk:k?k.tk:null,tkRaw:k?k.raw:null,updatedAt:meta.updatedAt||"",updatedBy:meta.updatedBy||""};
  }
  async function decodeDoc(id,doc){
    if(!doc||!doc.core)return null;
    const k=await getTK(doc);if(!k)return null;
    const core=await openObj(k.tk,doc.core);if(!core)return null;
    const reps={};
    for(const aid of Object.keys(doc.rep||{})){const b=doc.rep[aid];const o=await openObj(k.tk,b);if(o)reps[aid]=Object.assign({},o,{at:b.at||"",by:b.by||""})}
    return mk(id,doc,core,reps,k);
  }
  const repPayload=r=>({status:r.status||"todo",progress:Number(r.progress)||0,eta:r.eta||"",entries:Array.isArray(r.entries)?r.entries:[],note:r.note||""});
  function entriesOf(r){
    const e=Array.isArray(r.entries)?r.entries.slice():[];
    if(r.note)e.push({id:"legacy",at:r.at||"",by:r.by||"",type:"report",text:r.note});
    return e.sort((a,b)=>String(b.at||"").localeCompare(String(a.at||"")));
  }
  const lastEntry=r=>entriesOf(r)[0]||null;
  function overall(t){
    if(!t.assignees.length)return t.coreStatus||"todo";
    const s=t.assignees.map(a=>(t.reps[a.id]||{}).status||"todo");
    if(s.includes("issue"))return"issue";
    if(s.every(x=>x==="done"))return"done";
    if(s.some(x=>x!=="todo"))return"doing";
    return"todo";
  }
  function deptsOf(t){return [...new Set([t.primary].concat(t.assignees.map(a=>a.dept)))].filter(d=>DEPTS.some(x=>x.id===d))}
  function coreObj(t){return{title:t.title,block:t.block,due:t.due,prio:t.prio,repeat:t.repeat,comment:t.comment,status:t.coreStatus,primary:t.primary,assignees:t.assignees}}
  async function writeCore(t,full){
    const nd=deptsOf(t);
    for(const d of nd)if(!keys[d])throw new Error("nokey");
    const removed=(t.depts||[]).some(d=>!nd.includes(d));
    if(!t.tkRaw||removed){t.tkRaw=crypto.getRandomValues(new Uint8Array(32));t.tk=await importDK(t.tkRaw);full=true}
    const wk={};for(const d of nd)wk[d]=await seal(keys[d],t.tkRaw);
    const base={depts:nd,n:t.n||0,wk,core:await sealObj(t.tk,coreObj(t)),updatedAt:t.updatedAt||"",updatedBy:t.updatedBy||""};
    if(full){
      const rep={},ids=new Set(t.assignees.map(a=>a.id));
      for(const aid of Object.keys(t.reps)){
        if(!ids.has(aid))continue;const r=t.reps[aid];
        const b=await sealObj(t.tk,repPayload(r));
        rep[aid]={iv:b.iv,ct:b.ct,at:r.at||"",by:r.by||""};
      }
      base.rep=rep;
      await fb.set("tasks/"+t.id,base);
    }else await fb.merge("tasks/"+t.id,base);
    t.depts=nd;
  }
  async function writeRep(t,aid){
    if(!t.tk){await writeCore(t,true);return}
    const r=t.reps[aid];
    const b=await sealObj(t.tk,repPayload(r));
    await fb.merge("tasks/"+t.id,{rep:{[aid]:{iv:b.iv,ct:b.ct,at:r.at||"",by:r.by||""}},updatedAt:t.updatedAt||"",updatedBy:t.updatedBy||""});
  }

  /* ---------- data ---------- */
  function subscribeData(){
    if(unsubs.length)return;
    unsubs.push(fb.watchTasks(isDir()?null:role,async docs=>{
      const seq=++snapSeq;
      const out=[];
      for(const d of docs){const t=await decodeDoc(d.id,d.data);if(t)out.push(t)}
      if(seq!==snapSeq||!role)return;
      tasks=out;loaded=true;render(false);
    },err=>{loaded=true;render(true);toast("Немає доступу до задач: "+((err&&err.code)||"помилка"))}));
    const deptDocs=isDir()?DEPTS.map(d=>d.id):[role];
    deptDocs.forEach(d=>{
      unsubs.push(fb.watchDoc("plans/"+d,async doc=>{
        if(!role)return;
        if(!doc){delete plans[d]}else{const o=await openObj(keys[d],doc);if(o)plans[d]=Object.assign({},o,{updatedAt:doc.updatedAt})}
        if(editingInside())pendingRender=true;else renderPlans();
      },()=>{}));
      unsubs.push(fb.watchDoc("staff/"+d,async doc=>{
        if(!role)return;
        if(doc){const o=await openObj(keys[d],doc);if(o&&Array.isArray(o.people))staff[d]=o.people}
        renderDatalists();
      },()=>{}));
    });
  }
  const queues={};
  function enqueue(id,fn){const p=(queues[id]||Promise.resolve()).then(fn,fn);queues[id]=p.catch(()=>{});return p}
  function writeErr(e){
    const c=(e&&e.code)||"";
    if(/permission-denied/.test(c))toast("Немає прав на цю зміну.");
    else if(/resource-exhausted/.test(c))toast("Перевищено безкоштовний ліміт бази на сьогодні.");
    else toast("Не вдалося зберегти"+(c?" ("+c+")":"")+". Спробуйте ще раз.");
  }
  function stamp(t){t.updatedAt=new Date().toISOString();t.updatedBy=role}

  function setRep(id,aid,fields){
    const t=tasks.find(x=>x.id===id);if(!t)return;
    const a=t.assignees.find(x=>x.id===aid);
    if(!canRep(t,a)){toast("Цей звіт заповнює інший підрозділ.");render(true);return}
    t.reps[aid]=Object.assign({status:"todo",note:""},t.reps[aid],fields,{at:new Date().toISOString(),by:role});
    stamp(t);
    enqueue(t.id,()=>writeRep(t,aid)).catch(writeErr);
  }
  function addEntry(id,aid,type,text){
    const t=tasks.find(x=>x.id===id);if(!t)return false;
    const a=t.assignees.find(x=>x.id===aid);
    if(!canRep(t,a)){toast("Цей звіт заповнює інший підрозділ.");return false}
    const r=Object.assign({status:"todo"},t.reps[aid]||{});
    const entries=entriesOf(r).map(e=>e.id==="legacy"?Object.assign({},e,{id:uid()}):e);
    entries.unshift({id:uid(),at:new Date().toISOString(),by:role,type,text});
    const f={entries,note:""};
    if(type==="issue")f.status="issue";
    else if(r.status==="todo")f.status="doing";
    setRep(id,aid,f);
    return true;
  }
  function setCore(id,fields){
    const t=tasks.find(x=>x.id===id);if(!t||!canEditAll())return;
    Object.assign(t,fields);stamp(t);
    enqueue(t.id,()=>writeCore(t,false)).catch(writeErr);
  }
  function addStaff(list){
    if(!isDir())return;
    const byDept={};
    list.forEach(a=>{if(!a.name)return;(byDept[a.dept]=byDept[a.dept]||[]).push({position:a.position||"",name:a.name})});
    Object.keys(byDept).forEach(d=>{
      if(!keys[d])return;
      const cur=(staff[d]||[]).map(x=>Object.assign({},x));let changed=false;
      byDept[d].forEach(p=>{const ex=cur.find(x=>x.name.toLowerCase()===p.name.toLowerCase());if(!ex){cur.push(p);changed=true}else if(p.position&&ex.position!==p.position){ex.position=p.position;changed=true}});
      if(!changed)return;
      cur.sort((a,b)=>a.name.localeCompare(b.name,"uk"));
      staff[d]=cur;renderDatalists();
      enqueue("staff-"+d,async()=>{const b=await sealObj(keys[d],{people:cur});await fb.set("staff/"+d,{iv:b.iv,ct:b.ct,updatedAt:new Date().toISOString()})}).catch(()=>{});
    });
  }

  /* ---------- derived ---------- */
  function scopeTasks(){
    if(!isDir())return tasks.filter(t=>t.depts.includes(role));
    return ui.dept==="all"?tasks:tasks.filter(t=>t.depts.includes(ui.dept));
  }
  function blockIdx(b){const i=BLOCK_ORDER.indexOf(b);return i<0?100:i}
  function sortTasks(a,b){return blockIdx(a.block)-blockIdx(b.block)||String(a.block||"").localeCompare(String(b.block||""),"uk")||(a.n||0)-(b.n||0)}
  function isOverdue(t){return t.due&&t.due<today&&overall(t)!=="done"}
  function filtered(){
    const q=ui.q.trim().toLowerCase();
    return scopeTasks().filter(t=>{
      const st=overall(t);
      if(ui.block&&t.block!==ui.block)return false;
      if(ui.owner&&!t.assignees.some(a=>personLabel(a)===ui.owner))return false;
      if(ui.prio&&t.prio!==ui.prio)return false;
      if(ui.status==="overdue"){if(!isOverdue(t))return false}
      else if(ui.status&&st!==ui.status)return false;
      if(q){
        const hay=[t.title,t.block,t.comment].concat(t.assignees.map(a=>personLabel(a)+" "+((t.reps[a.id]||{}).note||""))).join(" ").toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    }).sort((a,b)=>(a.primary||"").localeCompare(b.primary||"")||sortTasks(a,b));
  }

  /* ---------- render pieces ---------- */
  function statusSel(st,attrs,ok,cls){
    return `<select class="pill st-${st} ${cls||""}" ${attrs} aria-label="Статус" ${ok?"":"disabled"}>${STATUSES.map(s=>`<option value="${s.id}" ${s.id===st?"selected":""}>${s.name}</option>`).join("")}</select>`;
  }
  function statusPill(st){return `<span class="pill st-${st}"><span class="dot"></span>${stName(st)}</span>`}
  function prioBadge(p){p=p||"med";return `<span class="prio p-${p}"><i><b></b><b></b><b></b></i>${PRIOS[p]}</span>`}
  function prioCell(t){
    const p=t.prio||"med";
    if(!canEditAll())return prioBadge(p);
    return `<label class="prio p-${p}"><i><b></b><b></b><b></b></i><select class="prio-sel p-${p}" data-act="prio" data-id="${esc(t.id)}" aria-label="Пріоритет">${Object.keys(PRIOS).map(k=>`<option value="${k}" ${k===p?"selected":""}>${PRIOS[k]}</option>`).join("")}</select></label>`;
  }
  function dueText(t){
    if(!t.due)return t.repeat?`<span class="repeat">${esc(t.repeat)}</span>`:`<span class="note">без терміну</span>`;
    return `<span class="mono ${isOverdue(t)?"overdue":""}">${fmtDate(t.due)}</span>${t.repeat?` <span class="repeat">${esc(t.repeat)}</span>`:""}`;
  }
  const multi=t=>t.depts.length>1;
  function who(a,t){return `<span class="asg-who"><b>${esc(a.position||"Відповідальний")}</b>${a.name?" "+esc(a.name):' <span class="note">ПІБ не вказано</span>'}${multi(t)?` <span class="dtag">${esc(deptName(a.dept))}</span>`:""}</span>`}
  function progBar(r){
    const p=Number(r.progress)||0;
    if(!p&&!r.eta)return"";
    return `<div class="prog-wrap">${p?`<div class="prog"><span style="width:${p}%"></span></div><span class="prog-l">${p}%</span>`:""}${r.eta?`<span class="prog-l">до ${fmtDate(r.eta)}</span>`:""}</div>`;
  }
  function asgBlock(t,a){
    const r=t.reps[a.id]||{}, st=r.status||"todo", es=entriesOf(r), le=es[0];
    return `<div class="asg"><div class="asg-h">${who(a,t)}${statusPill(st)}</div>${progBar(r)}
      ${le?`<div class="asg-last"><span class="etype et-${esc(le.type)}">${esc(typeName(le.type))}</span> ${esc(le.text)}</div><span class="upd">${fmtStamp(le.at)}${le.by?" · "+esc(roleName(le.by)):""}${es.length>1?" · усього записів: "+es.length:""}</span>`
        :`<div class="note">Записів ще немає${canRep(t,a)?" — відкрийте задачу, щоб додати":""}</div>`}</div>`;
  }
  function renderDepts(){
    if(!isDir())return;
    const tabs=[{id:"all",name:"Усі підрозділи"}].concat(DEPTS);
    $("#depts").innerHTML=tabs.map(d=>{
      const n=d.id==="all"?tasks.length:tasks.filter(t=>t.depts.includes(d.id)).length;
      return `<button class="dept" role="tab" type="button" data-dept="${d.id}" aria-selected="${d.id===ui.dept}">${d.name}<span class="cnt">${n}</span></button>`;
    }).join("");
  }
  function renderBanner(){$("#banner").hidden=true}
  function renderPlans(){
    if(!role)return;
    const list=isDir()?(ui.dept==="all"?DEPTS.map(d=>d.id):[ui.dept]):[role];
    $("#plans").innerHTML=list.map(id=>{
      const p=plans[id]||{};
      const head=`<div class="plan-h"><h2>План: ${esc(deptName(id))}</h2><span class="m">${p.period?esc(p.period):""}${p.updatedAt?" · оновлено "+fmtStamp(p.updatedAt):""}</span></div>`;
      if(canEditAll()){
        return `<section class="panel plan">${head}
          <div class="row"><input class="field" id="plPeriod-${id}" value="${esc(p.period||"")}" placeholder="Період, напр. листопад 2026"></div>
          <textarea class="field" id="plText-${id}" placeholder="Цілі та ключові результати періоду для підрозділу">${esc(p.text||"")}</textarea>
          <div class="row"><button class="btn" type="button" data-plan="${id}">Зберегти план</button></div></section>`;
      }
      return `<section class="panel plan">${head}${p.text?`<p class="plan-text">${esc(p.text)}</p>`:`<p class="note">Директор ще не заповнив план для підрозділу.</p>`}</section>`;
    }).join("");
  }
  function renderSummary(){
    const all=scopeTasks();
    const c={todo:0,doing:0,done:0,issue:0};all.forEach(t=>c[overall(t)]++);
    const over=all.filter(isOverdue).length, total=all.length, pct=total?Math.round(c.done/total*100):0;
    const stat=(key,label,val,color)=>`<button type="button" class="stat" data-status="${key}" aria-pressed="${ui.status===key}"><span class="lbl">${color?`<span class="dot" style="background:var(${color})"></span>`:""}${label}</span><span class="val">${val}</span></button>`;
    const seg=(n,color)=>total&&n?`<span style="width:${n/total*100}%;background:var(${color})"></span>`:"";
    $("#summary").innerHTML=stat("","Усього задач",total,"")+stat("todo","Не розпочато",c.todo,"--todo")+stat("doing","В роботі",c.doing,"--doing")+stat("done","Виконано",c.done,"--done")+stat("issue","Проблема",c.issue,"--issue")+stat("overdue","Прострочено",over,"--issue")+
      `<div class="progress"><div class="bar" role="img" aria-label="Виконано ${pct}%">${seg(c.done,"--done")}${seg(c.doing,"--doing")}${seg(c.issue,"--issue")}</div><div class="meta"><span>Виконано <b class="mono">${pct}%</b> плану</span><span>Сьогодні <span class="mono">${fmtDate(today)}</span></span></div></div>`;
  }
  function renderDatalists(){
    $("#dls").innerHTML=DEPTS.map(d=>{
      const people=staff[d.id]||[];
      const pos=[...new Set(DEFAULT_POS[d.id].concat(people.map(p=>p.position)).concat(tasks.flatMap(t=>t.assignees.filter(a=>a.dept===d.id).map(a=>a.position))).filter(Boolean))];
      return `<datalist id="pos-${d.id}">${pos.map(p=>`<option value="${esc(p)}">`).join("")}</datalist><datalist id="nm-${d.id}">${people.map(p=>`<option value="${esc(p.name)}" label="${esc(p.position)}">`).join("")}</datalist>`;
    }).join("")+`<datalist id="blockList">${[...new Set(BLOCK_ORDER.concat(tasks.map(t=>t.block).filter(Boolean)))].map(b=>`<option value="${esc(b)}">`).join("")}</datalist>`;
  }
  function renderFilters(){
    const all=scopeTasks();
    const blocks=[...new Set(all.map(t=>t.block).filter(Boolean))].sort((a,b)=>blockIdx(a)-blockIdx(b)||a.localeCompare(b,"uk"));
    const owners=[...new Set(all.flatMap(t=>t.assignees.map(personLabel)))].sort((a,b)=>a.localeCompare(b,"uk"));
    if(ui.block&&!blocks.includes(ui.block))ui.block="";
    if(ui.owner&&!owners.includes(ui.owner))ui.owner="";
    $("#fBlock").innerHTML=`<option value="">Усі блоки</option>`+blocks.map(b=>`<option ${b===ui.block?"selected":""}>${esc(b)}</option>`).join("");
    $("#fOwner").innerHTML=`<option value="">Усі відповідальні</option>`+owners.map(o=>`<option ${o===ui.owner?"selected":""}>${esc(o)}</option>`).join("");
    $("#fPrio").value=ui.prio;
    $("#clearF").hidden=!(ui.q||ui.block||ui.owner||ui.prio||ui.status);
    document.querySelectorAll(".seg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===ui.view)));
  }
  function emptyState(){
    if(!loaded)return `<div class="panel empty"><strong>Розшифрування задач…</strong><span>Зачекайте кілька секунд.</span></div>`;
    if(!scopeTasks().length){
      const nm=isDir()?(ui.dept==="all"?"Підприємство":deptName(ui.dept)):deptName(role);
      return `<div class="panel empty"><strong>${esc(nm)}: задач ще немає</strong><span>${isDir()?"Додайте першу задачу кнопкою «Нова задача».":"Директор ще не поставив задачі вашому підрозділу."}</span></div>`;
    }
    return `<div class="panel empty"><strong>Нічого не знайдено</strong><span>Змініть пошук або скиньте фільтри.</span></div>`;
  }
  function renderTable(list){
    const showDept=isDir()&&ui.dept==="all";
    const ed=canEditAll();
    let html=`<div class="panel tablewrap"><table><thead><tr><th class="col-title">Задача</th><th class="col-asg">Відповідальні та їхні звіти</th><th class="col-due">Термін</th><th class="col-prio">Пріоритет</th><th class="col-st">Статус</th></tr></thead><tbody>`;
    let cur=null;
    list.forEach(t=>{
      const key=(showDept?t.primary+"|":"")+(t.block||"");
      if(key!==cur){
        cur=key;
        const g=list.filter(x=>((showDept?x.primary+"|":"")+(x.block||""))===key);const d=g.filter(x=>overall(x)==="done").length;
        html+=`<tr class="group"><td colspan="5">${showDept?esc(deptName(t.primary))+" · ":""}${esc(t.block||"Без блоку")}<span class="gmeta">${d} з ${g.length} виконано</span></td></tr>`;
      }
      html+=`<tr class="row" data-open="${esc(t.id)}" tabindex="0">
        <td><button type="button" class="title-btn big" data-act="open" data-id="${esc(t.id)}">${esc(t.title)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>${t.repeat?` <span class="repeat">${esc(t.repeat)}</span>`:""}${multi(t)?' <span class="repeat">спільна</span>':""}${t.comment?`<span class="dnote">Примітка директора: ${esc(t.comment)}</span>`:""}</td>
        <td>${t.assignees.length?t.assignees.map(a=>asgBlock(t,a)).join(""):`<span class="note">Відповідальних не призначено${ed?" — відкрийте задачу, щоб додати":""}</span>`}</td>
        <td>${ed?`<input type="date" class="cell-in ${isOverdue(t)?"overdue":""}" data-act="due" data-id="${esc(t.id)}" value="${esc(t.due||"")}" aria-label="Термін">${t.repeat?`<span class="repeat">${esc(t.repeat)}</span>`:""}`:dueText(t)}</td>
        <td>${prioCell(t)}</td>
        <td>${statusPill(overall(t))}</td>
      </tr>`;
    });
    return html+`</tbody></table></div>`;
  }
  function renderBoard(list){
    const showDept=isDir()&&ui.dept==="all";
    return `<div class="board">${STATUSES.map(s=>{
      const items=list.filter(t=>overall(t)===s.id).sort((a,b)=>(PRIO_RANK[a.prio]??1)-(PRIO_RANK[b.prio]??1)||String(a.due||"9").localeCompare(String(b.due||"9")));
      return `<div class="col"><div class="col-h">${statusPill(s.id)}<span class="n">${items.length}</span></div>${
        items.map(t=>`<article class="card" data-open="${esc(t.id)}" style="cursor:pointer">
          <span class="blk">${showDept?`<span class="dtag">${esc(deptName(t.primary))}</span>`:""}${esc(t.block||"")}${multi(t)?'<span class="dtag">спільна</span>':""}</span>
          <button type="button" class="title-btn" data-act="open" data-id="${esc(t.id)}">${esc(t.title)}</button>
          <div class="chips">${t.assignees.map(a=>`<span class="chip"><span class="dot" style="background:var(--${(t.reps[a.id]||{}).status||"todo"})"></span>${esc(personLabel(a))}</span>`).join("")||'<span class="note">Без відповідальних</span>'}</div>
          <div class="ft">${prioBadge(t.prio)}${dueText(t)}</div>
        </article>`).join("")||`<span class="note" style="padding:4px">Порожньо</span>`
      }</div>`;
    }).join("")}</div><p class="note" style="margin-top:8px">Статус картки складається зі статусів відповідальних: змінюйте свій статус у таблиці або в картці задачі.</p>`;
  }
  function renderOwners(list){
    const map=new Map();
    list.forEach(t=>{
      if(!t.assignees.length){const k="Не призначено";if(!map.has(k))map.set(k,[]);map.get(k).push({t,a:null});return}
      t.assignees.forEach(a=>{const k=personLabel(a);if(!map.has(k))map.set(k,[]);map.get(k).push({t,a})});
    });
    const owners=[...map.keys()].sort((a,b)=>a.localeCompare(b,"uk"));
    return `<div class="owners">${owners.map(o=>{
      const items=map.get(o).sort((x,y)=>(PRIO_RANK[x.t.prio]??1)-(PRIO_RANK[y.t.prio]??1)||String(x.t.due||"9").localeCompare(String(y.t.due||"9")));
      const sts=items.map(x=>x.a?((x.t.reps[x.a.id]||{}).status||"todo"):overall(x.t));
      const d=sts.filter(s=>s==="done").length, iss=sts.filter(s=>s==="issue").length, ov=items.filter(x=>isOverdue(x.t)).length;
      const dept=items[0].a?deptName(items[0].a.dept):"";
      return `<section class="panel owner-card"><div class="owner-h"><h3>${esc(o)}</h3><span class="m">${dept?esc(dept)+" · ":""}${d}/${items.length} виконано${iss?` · <span style="color:var(--issue)">${iss} проблем</span>`:""}${ov?` · <span style="color:var(--issue)">${ov} простр.</span>`:""}</span></div>
      <ul class="olist">${items.map(({t,a})=>{
        const r=a?(t.reps[a.id]||{}):{};
        const le=a?lastEntry(r):null;
        return `<li data-open="${esc(t.id)}" style="cursor:pointer"><button type="button" class="title-btn" data-act="open" data-id="${esc(t.id)}">${esc(t.title)}</button>${a?statusPill(r.status||"todo"):statusPill(overall(t))}
        <div class="sub"><span>${esc(t.block||"")}</span>${dueText(t)}${prioBadge(t.prio)}${a&&r.progress?`<span class="mono">${Number(r.progress)}%</span>`:""}${t.assignees.length>1?`<span>разом з: ${esc(t.assignees.filter(x=>x!==a).map(personLabel).join(", "))}</span>`:""}</div>${le?`<div class="sub asg-last"><span class="etype et-${esc(le.type)}">${esc(typeName(le.type))}</span> ${esc(le.text)}</div>`:""}</li>`;
      }).join("")}</ul></section>`;
    }).join("")}</div>`;
  }
  function renderDirector(){
    const rows=[];
    scopeTasks().sort(sortTasks).forEach(t=>t.assignees.forEach(a=>{
      const r=t.reps[a.id]||{}, le=lastEntry(r);
      if((r.status==="issue")||(le&&le.type==="question"))rows.push({t,a,r,le});
    }));
    $("#director").innerHTML=`<h2>Питання до директора</h2>${
      rows.length?`<ul>${rows.map(({t,a,r,le})=>{
        const kind=r.status==="issue"?statusPill("issue"):`<span class="etype et-question">Питання</span>`;
        return `<li>${kind}<button type="button" class="title-btn" data-act="open" data-id="${esc(t.id)}">${esc(t.title)}</button><span class="c">${esc(personLabel(a))}${le?" — "+esc(le.text):""}</span></li>`;
      }).join("")}</ul>`
      :`<p>${isDir()?"Тут з'являються задачі зі статусом «Проблема» та записи типу «Питання до директора». Зараз таких немає.":"Якщо задача застрягла, відкрийте її та додайте запис «Проблема» або «Питання до директора». Він з'явиться тут і в директора."}</p>`}`;
  }

  let pendingRender=false;
  function editingInside(){const ae=document.activeElement;return ae&&($("#view").contains(ae)||$("#plans").contains(ae))&&/^(INPUT|TEXTAREA)$/.test(ae.tagName)}
  function render(force){
    if(!role)return;
    if(!force&&editingInside()){pendingRender=true;renderSummary();renderDirector();renderDepts();return}
    pendingRender=false;
    $("#addBtn").hidden=!canEditAll();
    renderDepts();renderBanner();renderPlans();renderSummary();renderFilters();renderDatalists();renderDirector();
    const list=filtered();
    let html;
    if(!list.length)html=emptyState();
    else if(ui.view==="board")html=renderBoard(list);
    else if(ui.view==="owners")html=renderOwners(list);
    else html=renderTable(list);
    $("#view").innerHTML=html;
    $("#view").querySelectorAll("textarea.cell-in").forEach(autoGrow);
  }
  function autoGrow(el){el.style.height="auto";el.style.height=Math.min(el.scrollHeight+2,200)+"px"}

  /* ---------- events ---------- */
  $("#depts").addEventListener("click",e=>{const b=e.target.closest("[data-dept]");if(!b)return;ui.dept=b.dataset.dept;ui.block=ui.owner=ui.status="";render(true)});
  $("#summary").addEventListener("click",e=>{const b=e.target.closest("[data-status]");if(!b)return;const s=b.dataset.status;ui.status=(ui.status===s)?"":s;render(true)});
  $("#q").addEventListener("input",e=>{ui.q=e.target.value;render(true)});
  $("#fBlock").addEventListener("change",e=>{ui.block=e.target.value;render(true)});
  $("#fOwner").addEventListener("change",e=>{ui.owner=e.target.value;render(true)});
  $("#fPrio").addEventListener("change",e=>{ui.prio=e.target.value;render(true)});
  $("#clearF").addEventListener("click",()=>{ui.q=ui.block=ui.owner=ui.prio=ui.status="";$("#q").value="";render(true)});
  document.querySelector(".seg").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(!b)return;ui.view=b.dataset.view;saveUi();render(true)});

  $("#plans").addEventListener("click",e=>{
    const b=e.target.closest("[data-plan]");if(!b||!canEditAll())return;
    const id=b.dataset.plan;
    const obj={text:$("#plText-"+id).value,period:$("#plPeriod-"+id).value.trim()};
    const at=new Date().toISOString();
    plans[id]=Object.assign({},obj,{updatedAt:at});
    enqueue("plan-"+id,async()=>{const box=await sealObj(keys[id],obj);await fb.set("plans/"+id,{iv:box.iv,ct:box.ct,updatedAt:at,updatedBy:role})})
      .then(()=>{toast("План збережено");renderPlans()},writeErr);
  });

  const view=$("#view");
  view.addEventListener("change",e=>{
    const el=e.target, id=el.dataset.id, act=el.dataset.act; if(!id||!act)return;
    if(act==="rstatus"){setRep(id,el.dataset.aid,{status:el.value});render(true);toast("Статус: "+stName(el.value))}
    else if(act==="rnote"){setRep(id,el.dataset.aid,{note:el.value});toast("Звіт збережено")}
    else if(act==="prio"){setCore(id,{prio:el.value});render(true)}
    else if(act==="due"){setCore(id,{due:el.value||""})}
  });
  view.addEventListener("input",e=>{if(e.target.matches("textarea.cell-in"))autoGrow(e.target)});
  document.addEventListener("focusout",()=>{setTimeout(()=>{if(pendingRender&&!editingInside())render(true)},50)});
  document.addEventListener("click",e=>{
    const b=e.target.closest('[data-act="open"]');if(b){openDlg(b.dataset.id);return}
    if(e.target.closest("input,select,textarea,label,a,dialog"))return;
    const row=e.target.closest("[data-open]");if(row)openDlg(row.dataset.open);
  });
  document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches&&e.target.matches("tr.row[data-open]"))openDlg(e.target.dataset.open)});

  /* ---------- task dialog ---------- */
  const dlg=$("#dlg"); let editId=null;
  $("#iDept").innerHTML=DEPTS.map(d=>`<option value="${d.id}">${d.name}</option>`).join("");
  $("#iStatus").innerHTML=STATUSES.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
  function asgRow(a){
    const d=a.dept||"vyrobnytstvo";
    return `<div class="asg-row" data-aid="${esc(a.id)}">
      <select class="field a-dept" aria-label="Підрозділ">${DEPTS.map(x=>`<option value="${x.id}" ${x.id===d?"selected":""}>${x.name}</option>`).join("")}</select>
      <input class="field a-pos" list="pos-${d}" value="${esc(a.position||"")}" placeholder="Посада" aria-label="Посада">
      <input class="field a-name" list="nm-${d}" value="${esc(a.name||"")}" placeholder="ПІБ, напр. Петренко Іван Іванович" aria-label="ПІБ">
      <button class="btn ghost a-del" type="button" aria-label="Прибрати відповідального">✕</button></div>`;
  }
  function renderAsgEmpty(){const l=$("#asgList");if(!l.querySelector(".asg-row")&&!l.querySelector(".asg-empty"))l.innerHTML=`<p class="note asg-empty">Додайте хоча б одного відповідального: посаду й ПІБ.</p>`}
  $("#asgAdd").addEventListener("click",()=>{
    const l=$("#asgList");const em=l.querySelector(".asg-empty");if(em)em.remove();
    const rows=l.querySelectorAll(".asg-row");const last=rows.length?rows[rows.length-1].querySelector(".a-dept"):null;
    l.insertAdjacentHTML("beforeend",asgRow({id:uid(),dept:last?last.value:$("#iDept").value}));
    const nr=l.querySelectorAll(".asg-row");nr[nr.length-1].querySelector(".a-pos").focus();
  });
  $("#asgList").addEventListener("click",e=>{if(e.target.closest(".a-del")){e.target.closest(".asg-row").remove();renderAsgEmpty()}});
  $("#asgList").addEventListener("change",e=>{
    const row=e.target.closest(".asg-row");if(!row)return;
    if(e.target.classList.contains("a-dept")){const d=e.target.value;row.querySelector(".a-pos").setAttribute("list","pos-"+d);row.querySelector(".a-name").setAttribute("list","nm-"+d)}
    if(e.target.classList.contains("a-name")){
      const d=row.querySelector(".a-dept").value, nm=e.target.value.trim().toLowerCase();
      const p=(staff[d]||[]).find(x=>x.name.toLowerCase()===nm);
      if(p&&!row.querySelector(".a-pos").value)row.querySelector(".a-pos").value=p.position;
    }
  });
  function repCard(t,a){
    const r=t.reps[a.id]||{}, ok=canRep(t,a), st=r.status||"todo", es=entriesOf(r), aid=esc(a.id);
    const controls=ok?`<div class="rep-ctrl">
        <div class="fl"><label>Статус</label>${statusSel(st,`data-r="status" data-aid="${aid}"`,true,"")}</div>
        <div class="fl"><label>Готовність</label><select class="field" data-r="progress" data-aid="${aid}">${PROGRESS.map(p=>`<option value="${p}" ${p===(Number(r.progress)||0)?"selected":""}>${p}%</option>`).join("")}</select></div>
        <div class="fl"><label>Очікувана дата</label><input type="date" class="field mono" data-r="eta" data-aid="${aid}" value="${esc(r.eta||"")}"></div>
      </div>
      <div class="rep-new">
        <label style="font-size:12px;font-weight:700;color:var(--muted)">Новий запис</label>
        <div class="rep-new-row"><select class="field" data-r="type" aria-label="Тип запису">${ENTRY_TYPES.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}</select></div>
        <textarea class="field" data-r="text" placeholder="Напишіть, що зроблено, стан, ціни, місце розташування, що заважає…" aria-label="Текст запису"></textarea>
        <div><button class="btn primary" type="button" data-addentry="${aid}">Додати запис</button></div>
      </div>`
      :`<div class="rep-ro">${statusPill(st)}${progBar(r)}</div>`;
    const hist=es.length?`<ul class="hist">${es.map(e=>`<li><div class="hist-h"><span class="etype et-${esc(e.type)}">${esc(typeName(e.type))}</span><span class="upd">${fmtStamp(e.at)}${e.by?" · "+esc(roleName(e.by)):""}</span></div><div class="hist-t">${esc(e.text)}</div></li>`).join("")}</ul>`:`<p class="note">Записів ще немає.</p>`;
    return `<section class="rep ${ok&&!isDir()?"mine":""}" data-aid="${aid}"><div class="asg-h">${who(a,t)}${ok&&!isDir()?'<span class="mine-tag">ваш розділ</span>':""}</div>${controls}<div class="fl"><label>Історія записів</label>${hist}</div></section>`;
  }
  function repSection(t){
    if(!t)return `<p class="note">Статуси й записи відповідальних з'являться тут після збереження задачі.</p>`;
    if(!t.assignees.length)return "";
    const list=t.assignees.slice().sort((x,y)=>(canRep(t,y)&&!isDir()?1:0)-(canRep(t,x)&&!isDir()?1:0));
    return `<div class="fl"><label>Відповідальні: статуси та записи</label><div class="reps">${list.map(a=>repCard(t,a)).join("")}</div></div>`;
  }
  $("#repSection").addEventListener("change",e=>{
    const el=e.target, k=el.dataset.r, aid=el.dataset.aid;
    if(!editId||!aid||!["status","progress","eta"].includes(k))return;
    const v=k==="progress"?Number(el.value):el.value;
    setRep(editId,aid,{[k]:v});
    if(k==="status"){el.className="pill st-"+v;toast("Статус: "+stName(v))}else toast("Збережено");
  });
  $("#repSection").addEventListener("click",e=>{
    const b=e.target.closest("[data-addentry]");if(!b||!editId)return;
    const sec=b.closest(".rep"), aid=b.dataset.addentry;
    const ta=sec.querySelector('[data-r="text"]'), type=sec.querySelector('[data-r="type"]').value, text=ta.value.trim();
    if(!text){ta.focus();toast("Напишіть текст запису.");return}
    if(addEntry(editId,aid,type,text)){
      const t=tasks.find(x=>x.id===editId), a=t&&t.assignees.find(x=>x.id===aid);
      if(t&&a)sec.outerHTML=repCard(t,a);
      toast("Запис додано");render(true);
    }
  });
  function resetDel(show){$("#delWrap").innerHTML=show?`<button class="btn danger" type="button" id="delBtn">Видалити</button>`:""}
  function openDlg(id){
    editId=id||null;
    const t=id?tasks.find(x=>x.id===id):null;
    if(id&&!t)return;
    if(!id&&!canEditAll())return;
    const full=canEditAll();
    $("#dlgTitle").textContent=t?(full?"Редагувати задачу":"Задача"):"Нова задача";
    $("#coreEdit").hidden=!full;$("#asgEditor").hidden=!full;
    $("#coreRead").hidden=full;
    if(full){
      $("#iTitle").value=t?t.title:"";
      $("#iDept").value=t?t.primary:(ui.dept!=="all"?ui.dept:"vyrobnytstvo");
      $("#iBlock").value=t?t.block:(ui.block||"");
      $("#iDue").value=t?t.due:"";
      $("#iPrio").value=t?t.prio:"med";
      $("#iRepeat").value=t?t.repeat:"";
      $("#iStatus").value=t?t.coreStatus:"todo";
      $("#iComment").value=t?t.comment:"";
      $("#asgList").innerHTML=t?t.assignees.map(asgRow).join(""):asgRow({id:uid(),dept:$("#iDept").value});
      renderAsgEmpty();
    }else{
      $("#coreRead").innerHTML=`<div class="read-title">${esc(t.title)}</div>
        <div class="read-meta">${t.block?`<span>${esc(t.block)}</span>`:""}${dueText(t)}${prioBadge(t.prio)}${statusPill(overall(t))}</div>
        ${t.comment?`<p class="dnote">Примітка директора: ${esc(t.comment)}</p>`:""}`;
    }
    $("#repSection").innerHTML=repSection(t);
    const myReps=t?t.assignees.some(a=>canRep(t,a)):false;
    $("#dlgNote").textContent=full?"Статус, готовність і записи відповідальних зберігаються одразу. Кнопка «Зберегти задачу» зберігає назву, терміни та відповідальних."
      :(myReps?"Статус, готовність і записи зберігаються одразу. Записи інших учасників видно, але додає їх лише відповідний підрозділ.":"Перегляд задачі.");
    resetDel(!!t&&full);
    $("#saveBtn").hidden=!full;$("#saveBtn").textContent=t?"Зберегти задачу":"Поставити задачу";
    try{dlg.showModal()}catch(e){dlg.setAttribute("open","")}
    setTimeout(()=>{const f=full&&!t?$("#iTitle"):($('#repSection [data-r="text"]')||$("#cancelBtn"));if(f)f.focus()},30);
  }
  function closeDlg(){try{dlg.close()}catch(e){dlg.removeAttribute("open")}}
  $("#cancelBtn").addEventListener("click",closeDlg);
  $("#addBtn").addEventListener("click",()=>openDlg(null));
  $("#delWrap").addEventListener("click",e=>{
    if(e.target.id==="delBtn"){$("#delWrap").innerHTML=`<span class="confirm">Видалити задачу? <button class="btn danger" type="button" id="delYes">Так</button><button class="btn" type="button" id="delNo">Ні</button></span>`}
    else if(e.target.id==="delNo")resetDel(true);
    else if(e.target.id==="delYes"&&editId&&canEditAll()){
      const id=editId;tasks=tasks.filter(t=>t.id!==id);closeDlg();render(true);
      enqueue(id,()=>fb.del("tasks/"+id)).then(()=>toast("Задачу видалено"),writeErr);
    }
  });
  function collectReps(t){
    const changed=[];
    $("#repSection").querySelectorAll(".rep").forEach(el=>{
      const aid=el.dataset.aid, a=t.assignees.find(x=>x.id===aid);
      if(!canRep(t,a))return;
      const st=el.querySelector('[data-r="status"]').value, note=el.querySelector(".r-note").value;
      const r=t.reps[aid]||{};
      if((r.status||"todo")!==st||(r.note||"")!==note){t.reps[aid]={status:st,note,at:new Date().toISOString(),by:role};changed.push(aid)}
    });
    return changed;
  }
  $("#form").addEventListener("submit",e=>{
    e.preventDefault();
    const t=editId?tasks.find(x=>x.id===editId):null;
    if(canEditAll()){
      const title=$("#iTitle").value.trim(); if(!title){$("#iTitle").focus();return}
      const list=[];
      $("#asgList").querySelectorAll(".asg-row").forEach(r=>{
        const pos=r.querySelector(".a-pos").value.trim(), name=r.querySelector(".a-name").value.trim();
        if(pos||name)list.push({id:r.dataset.aid,dept:r.querySelector(".a-dept").value,position:pos,name});
      });
      const isNew=!t;
      const task=t||{id:fb.newId("tasks"),n:tasks.reduce((m,x)=>Math.max(m,x.n||0),0)+1,reps:{},depts:[],assignees:[],tk:null,tkRaw:null};
      Object.assign(task,{title,primary:$("#iDept").value,block:$("#iBlock").value.trim(),due:$("#iDue").value||"",prio:$("#iPrio").value,
        repeat:$("#iRepeat").value,coreStatus:$("#iStatus").value,comment:$("#iComment").value.trim(),assignees:list});
      stamp(task);
      if(isNew)tasks.push(task);
      enqueue(task.id,()=>writeCore(task,true)).then(()=>toast(isNew?"Задачу поставлено":"Збережено"),writeErr);
      addStaff(list);
    }
    closeDlg();render(true);
  });

  /* ---------- passwords (director) ---------- */
  const pwDlg=$("#pwDlg");
  function renderPwSet(){
    $("#pwSet").innerHTML=Object.keys(ROLES).map(k=>{
      const ch=vault&&vault.changedAt&&vault.changedAt[k];
      return `<div class="pwitem"><div class="pwitem-h"><b>${ROLES[k].name}</b>${ch?`<span class="tag-ok">змінено ${fmtStamp(ch)}</span>`:""}</div>
        <input class="field" type="password" id="cp-${k}" placeholder="Поточний пароль розділу" autocomplete="current-password">
        <div class="grid2"><input class="field" type="password" id="np-${k}" placeholder="Новий пароль" autocomplete="new-password"><input class="field" type="password" id="np2-${k}" placeholder="Повторіть новий пароль" autocomplete="new-password"></div>
        <div class="pwrow"><button class="btn" type="button" data-setpw="${k}">Змінити пароль</button><span class="err" id="pe-${k}"></span></div></div>`;
    }).join("");
  }
  function openPw(){if(!isDir())return;renderPwSet();try{pwDlg.showModal()}catch(e){pwDlg.setAttribute("open","")}}
  $("#settingsBtn").addEventListener("click",openPw);
  $("#pwClose").addEventListener("click",()=>{try{pwDlg.close()}catch(e){pwDlg.removeAttribute("open")}});
  $("#pwSet").addEventListener("click",async e=>{
    const b=e.target.closest("[data-setpw]");if(!b||!isDir()||!vault)return;
    const k=b.dataset.setpw, cur=$("#cp-"+k).value, p1=$("#np-"+k).value, p2=$("#np2-"+k).value, err=$("#pe-"+k);
    err.textContent="";
    if(!cur){err.textContent="Введіть поточний пароль розділу.";return}
    if(p1.length<MIN_PW){err.textContent="Новий пароль: щонайменше "+MIN_PW+" символів.";return}
    if(!(/[A-Za-zА-Яа-яІіЇїЄєҐґ]/.test(p1)&&/\d/.test(p1))){err.textContent="Додайте і літери, і цифри.";return}
    if(p1!==p2){err.textContent="Нові паролі не збігаються.";return}
    b.disabled=true;b.textContent="Зміна…";
    const old=JSON.parse(JSON.stringify(vault));
    let vaultChanged=false;
    try{
      try{await fb.verifyPassword(EMAIL[k],cur)}catch(ex){throw new Error("Поточний пароль невірний.")}
      const salt=b64(crypto.getRandomValues(new Uint8Array(16)));
      const kek=await deriveKek(p1,salt,vault.iter);
      const wrapped={};
      for(const d of ROLE_DEPTS[k]){if(!rawKeys[d])throw new Error("Немає ключа розділу.");wrapped[d]=await seal(kek,rawKeys[d])}
      const rev=((vault.rev||{})[k]||0)+1;
      const nv=JSON.parse(JSON.stringify(vault));
      nv.salts[k]=salt;nv.wrapped[k]=wrapped;nv.rev=nv.rev||{};nv.rev[k]=rev;nv.changedAt=nv.changedAt||{};nv.changedAt[k]=new Date().toISOString();
      if(k==="director")sessionRev=rev;
      await fb.set("settings/vault",nv);vaultChanged=true;
      await fb.changePassword(EMAIL[k],cur,p1);
      if(k==="director"){try{const s=readSession();if(s){s.rev=rev;const str=JSON.stringify(s);sessionStorage.setItem("zv-session",str);if(localStorage.getItem("zv-session"))localStorage.setItem("zv-session",str)}}catch(_){}}
      toast("Пароль «"+ROLES[k].name+"» змінено");
      ["cp-","np-","np2-"].forEach(p=>$("#"+p+k).value="");
    }catch(ex){
      if(k==="director")sessionRev=(old.rev||{}).director||0;
      if(vaultChanged){try{await fb.set("settings/vault",old)}catch(_){}}
      err.textContent=ex.code?authMsg(ex):(ex.message||"Не вдалося змінити пароль.");
    }
    b.disabled=false;b.textContent="Змінити пароль";
  });

  /* ---------- export ---------- */
  function rows(){
    const out=[["Підрозділ","Блок","Задача","Посада","ПІБ","Підрозділ відповідального","Термін","Пріоритет","Статус відповідального","Записи відповідального","Загальний статус"]];
    filtered().forEach(t=>{
      const base=[deptName(t.primary),t.block||"",t.title||""];
      const tail=[fmtDate(t.due),PRIOS[t.prio]||""];
      if(!t.assignees.length)out.push(base.concat(["","",""],tail,["","",stName(overall(t))]));
      t.assignees.forEach(a=>{const r=t.reps[a.id]||{};const es=entriesOf(r).map(e=>fmtStamp(e.at)+" "+typeName(e.type)+": "+e.text);
        out.push(base.concat([a.position||"",a.name||"",deptName(a.dept)],tail,[stName(r.status||"todo")+(r.progress?" ("+Number(r.progress)+"%)":""),es.join(" | "),stName(overall(t))]))});
    });
    return out;
  }
  $("#copyBtn").addEventListener("click",()=>{
    const tsv=rows().map(r=>r.map(v=>String(v).replace(/[\t\r\n]+/g," ")).join("\t")).join("\n");
    const ok=()=>toast("Скопійовано. Відкрийте Google Таблицю і вставте (Ctrl+V).");
    try{navigator.clipboard.writeText(tsv).then(ok,()=>fallbackCopy(tsv,ok))}catch(e){fallbackCopy(tsv,ok)}
  });
  function fallbackCopy(text,ok){
    const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
    let done=false;try{done=document.execCommand("copy")}catch(e){}
    ta.remove();
    if(done)ok();else toast("Браузер не дозволив копіювання. Скористайтеся кнопкою CSV.");
  }
  $("#csvBtn").hidden=false;
  $("#csvBtn").addEventListener("click",()=>{
    const csv="﻿"+rows().map(r=>r.map(v=>{v=String(v);return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="zadachi-"+(role||"")+"-"+today+".csv";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  });

  if(!(window.crypto&&crypto.subtle)){$("#loginErr").textContent="Цей браузер не підтримує шифрування. Відкрийте сайт через https у сучасному браузері.";}
};
