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
    vyrobnytstvo:["Начальник виробництва","Начальник виробничо-технічного відділу","Помічник начальника ВТВ","Головний інженер","Технолог","Майстер дільниці","Головний механік","ВТК / контролер","Постачальник","Комірник","Інженер з охорони праці","Оператор верстата з ЧПК"],
    administratsiia:["Директор","Начальник відділу кадрів","Інспектор з кадрів","Юрист","Головний бухгалтер","Бухгалтер","Бухгалтер-експерт","Адміністратор офісу","Офіс-менеджер","HR-менеджер","Менеджер із закупівель","Менеджер з продажу","Економіст","Логіст"]
  };
  const deptName=id=>(DEPTS.find(d=>d.id===id)||{}).name||id;
  const STATUSES=[{id:"todo",name:"Не розпочато"},{id:"doing",name:"В роботі"},{id:"done",name:"Виконано"},{id:"issue",name:"Проблема"}];
  const PRIOS={high:"Високий",med:"Середній",low:"Низький"};
  const PRIO_RANK={high:0,med:1,low:2};
  const BLOCK_ORDER=["Планування","Виробництво","Технологія","Виробничо-технічний відділ","Якість","Обладнання","Постачання і склад","Закупівлі","Персонал","Охорона праці","Кадри","Юридичні питання","Бухгалтерія і фінанси","Адміністрування офісу","HR і розвиток персоналу","Управління"];
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


  /* ---------- brand: НТЦ МЕТА logo (vector, follows light/dark theme) ---------- */
  const GEAR_D="M34.68 5.72 L34.56 5.59 L34.43 5.47 L34.30 5.35 L34.18 5.23 L34.05 5.11 L33.92 4.99 L33.78 4.87 L33.65 4.75 L33.52 4.64 L33.38 4.53 L33.25 4.41 L33.11 4.30 L32.97 4.19 L32.84 4.08 L32.70 3.97 L32.56 3.87 L32.42 3.76 L32.27 3.66 L32.13 3.55 L31.64 3.94 L31.16 4.34 L30.69 4.75 L30.22 5.16 L29.77 5.57 L29.32 6.00 L29.20 5.92 L29.07 5.85 L28.95 5.77 L28.83 5.70 L28.70 5.62 L28.57 5.55 L28.45 5.48 L28.32 5.41 L28.19 5.34 L28.07 5.28 L27.94 5.21 L27.81 5.14 L27.68 5.08 L27.55 5.02 L27.42 4.96 L27.28 4.89 L27.15 4.84 L27.02 4.78 L26.89 4.72 L26.75 4.66 L26.62 4.61 L26.48 4.56 L26.35 4.50 L26.21 4.45 L26.08 4.40 L25.94 4.35 L25.80 4.30 L25.67 4.26 L25.53 4.21 L25.39 4.17 L25.25 4.13 L25.11 4.08 L24.98 4.04 L24.84 4.00 L24.70 3.97 L24.56 3.93 L24.42 3.89 L24.28 3.86 L24.13 3.83 L23.99 3.79 L23.98 3.18 L23.95 2.56 L23.91 1.94 L23.86 1.32 L23.80 0.70 L23.73 0.08 L23.56 0.05 L23.39 0.02 L23.21 -0.00 L23.04 -0.03 L22.86 -0.05 L22.69 -0.07 L22.51 -0.09 L22.34 -0.11 L22.16 -0.12 L21.98 -0.14 L21.81 -0.15 L21.63 -0.16 L21.46 -0.17 L21.28 -0.18 L21.10 -0.19 L20.93 -0.19 L20.75 -0.20 L20.58 -0.20 L20.40 -0.20 L20.22 -0.20 L20.05 -0.20 L19.87 -0.19 L19.70 -0.19 L19.52 -0.18 L19.34 -0.17 L19.17 -0.16 L18.99 -0.15 L18.82 -0.14 L18.64 -0.12 L18.46 -0.11 L18.29 -0.09 L18.11 -0.07 L17.94 -0.05 L17.76 -0.03 L17.59 -0.00 L17.41 0.02 L17.24 0.05 L17.07 0.08 L17.00 0.70 L16.94 1.32 L16.89 1.94 L16.85 2.56 L16.82 3.18 L16.81 3.79 L16.67 3.83 L16.52 3.86 L16.38 3.89 L16.24 3.93 L16.10 3.97 L15.96 4.00 L15.82 4.04 L15.69 4.08 L15.55 4.13 L15.41 4.17 L15.27 4.21 L15.13 4.26 L15.00 4.30 L14.86 4.35 L14.72 4.40 L14.59 4.45 L14.45 4.50 L14.32 4.56 L14.18 4.61 L14.05 4.66 L13.91 4.72 L13.78 4.78 L13.65 4.84 L13.52 4.89 L13.38 4.96 L13.25 5.02 L13.12 5.08 L12.99 5.14 L12.86 5.21 L12.73 5.28 L12.61 5.34 L12.48 5.41 L12.35 5.48 L12.23 5.55 L12.10 5.62 L11.97 5.70 L11.85 5.77 L11.73 5.85 L11.60 5.92 L11.48 6.00 L11.03 5.57 L10.58 5.16 L10.11 4.75 L9.64 4.34 L9.16 3.94 L8.67 3.55 L8.53 3.66 L8.38 3.76 L8.24 3.87 L8.10 3.97 L7.96 4.08 L7.83 4.19 L7.69 4.30 L7.55 4.41 L7.42 4.53 L7.28 4.64 L7.15 4.75 L7.02 4.87 L6.88 4.99 L6.75 5.11 L6.62 5.23 L6.50 5.35 L6.37 5.47 L6.24 5.59 L6.12 5.72 L5.99 5.84 L5.87 5.97 L5.75 6.10 L5.63 6.22 L5.51 6.35 L5.39 6.48 L5.27 6.62 L5.15 6.75 L5.04 6.88 L4.93 7.02 L4.81 7.15 L4.70 7.29 L4.59 7.43 L4.48 7.56 L4.37 7.70 L4.27 7.84 L4.16 7.98 L4.06 8.13 L3.95 8.27 L4.34 8.76 L4.74 9.24 L5.15 9.71 L5.56 10.18 L5.97 10.63 L6.40 11.08 L6.32 11.20 L6.25 11.33 L6.17 11.45 L6.10 11.57 L6.02 11.70 L5.95 11.83 L5.88 11.95 L5.81 12.08 L5.74 12.21 L5.68 12.33 L5.61 12.46 L5.54 12.59 L5.48 12.72 L5.42 12.85 L5.36 12.98 L5.29 13.12 L5.24 13.25 L5.18 13.38 L5.12 13.51 L5.06 13.65 L5.01 13.78 L4.96 13.92 L4.90 14.05 L4.85 14.19 L4.80 14.32 L4.75 14.46 L4.70 14.60 L4.66 14.73 L4.61 14.87 L4.57 15.01 L4.53 15.15 L4.48 15.29 L4.44 15.42 L4.40 15.56 L4.37 15.70 L4.33 15.84 L4.29 15.98 L4.26 16.12 L4.23 16.27 L4.19 16.41 L3.58 16.42 L2.96 16.45 L2.34 16.49 L1.72 16.54 L1.10 16.60 L0.48 16.67 L0.45 16.84 L0.42 17.01 L0.40 17.19 L0.37 17.36 L0.35 17.54 L0.33 17.71 L0.31 17.89 L0.29 18.06 L0.28 18.24 L0.26 18.42 L0.25 18.59 L0.24 18.77 L0.23 18.94 L0.22 19.12 L0.21 19.30 L0.21 19.47 L0.20 19.65 L0.20 19.82 L0.20 20.00 L0.20 20.18 L0.20 20.35 L0.21 20.53 L0.21 20.70 L0.22 20.88 L0.23 21.06 L0.24 21.23 L0.25 21.41 L0.26 21.58 L0.28 21.76 L0.29 21.94 L0.31 22.11 L0.33 22.29 L0.35 22.46 L0.37 22.64 L0.40 22.81 L0.42 22.99 L0.45 23.16 L0.48 23.33 L1.10 23.40 L1.72 23.46 L2.34 23.51 L2.96 23.55 L3.58 23.58 L4.19 23.59 L4.23 23.73 L4.26 23.88 L4.29 24.02 L4.33 24.16 L4.37 24.30 L4.40 24.44 L4.44 24.58 L4.48 24.71 L4.53 24.85 L4.57 24.99 L4.61 25.13 L4.66 25.27 L4.70 25.40 L4.75 25.54 L4.80 25.68 L4.85 25.81 L4.90 25.95 L4.96 26.08 L5.01 26.22 L5.06 26.35 L5.12 26.49 L5.18 26.62 L5.24 26.75 L5.29 26.88 L5.36 27.02 L5.42 27.15 L5.48 27.28 L5.54 27.41 L5.61 27.54 L5.68 27.67 L5.74 27.79 L5.81 27.92 L5.88 28.05 L5.95 28.17 L6.02 28.30 L6.10 28.43 L6.17 28.55 L6.25 28.67 L6.32 28.80 L6.40 28.92 L5.97 29.37 L5.56 29.82 L5.15 30.29 L4.74 30.76 L4.34 31.24 L3.95 31.73 L4.06 31.87 L4.16 32.02 L4.27 32.16 L4.37 32.30 L4.48 32.44 L4.59 32.57 L4.70 32.71 L4.81 32.85 L4.93 32.98 L5.04 33.12 L5.15 33.25 L5.27 33.38 L5.39 33.52 L5.51 33.65 L5.63 33.78 L5.75 33.90 L5.87 34.03 L5.99 34.16 L6.12 34.28 L6.24 34.41 L6.37 34.53 L6.50 34.65 L6.62 34.77 L6.75 34.89 L6.88 35.01 L7.02 35.13 L7.15 35.25 L7.28 35.36 L7.42 35.47 L7.55 35.59 L7.69 35.70 L7.83 35.81 L7.96 35.92 L8.10 36.03 L8.24 36.13 L8.38 36.24 L8.53 36.34 L8.67 36.45 L9.16 36.06 L9.64 35.66 L10.11 35.25 L10.58 34.84 L11.03 34.43 L11.48 34.00 L11.60 34.08 L11.73 34.15 L11.85 34.23 L11.97 34.30 L12.10 34.38 L12.23 34.45 L12.35 34.52 L12.48 34.59 L12.61 34.66 L12.73 34.72 L12.86 34.79 L12.99 34.86 L13.12 34.92 L13.25 34.98 L13.38 35.04 L13.52 35.11 L13.65 35.16 L13.78 35.22 L13.91 35.28 L14.05 35.34 L14.18 35.39 L14.32 35.44 L14.45 35.50 L14.59 35.55 L14.72 35.60 L14.86 35.65 L15.00 35.70 L15.13 35.74 L15.27 35.79 L15.41 35.83 L15.55 35.87 L15.69 35.92 L15.82 35.96 L15.96 36.00 L16.10 36.03 L16.24 36.07 L16.38 36.11 L16.52 36.14 L16.67 36.17 L16.81 36.21 L16.82 36.82 L16.85 37.44 L16.89 38.06 L16.94 38.68 L17.00 39.30 L17.07 39.92 L17.24 39.95 L17.41 39.98 L17.59 40.00 L17.76 40.03 L17.94 40.05 L18.11 40.07 L18.29 40.09 L18.46 40.11 L18.64 40.12 L18.82 40.14 L18.99 40.15 L19.17 40.16 L19.34 40.17 L19.52 40.18 L19.70 40.19 L19.87 40.19 L20.05 40.20 L20.22 40.20 L20.40 40.20 L20.58 40.20 L20.75 40.20 L20.93 40.19 L21.10 40.19 L21.28 40.18 L21.46 40.17 L21.63 40.16 L21.81 40.15 L21.98 40.14 L22.16 40.12 L22.34 40.11 L22.51 40.09 L22.69 40.07 L22.86 40.05 L23.04 40.03 L23.21 40.00 L23.39 39.98 L23.56 39.95 L23.73 39.92 L23.80 39.30 L23.86 38.68 L23.91 38.06 L23.95 37.44 L23.98 36.82 L23.99 36.21 L24.13 36.17 L24.28 36.14 L24.42 36.11 L24.56 36.07 L24.70 36.03 L24.84 36.00 L24.98 35.96 L25.11 35.92 L25.25 35.87 L25.39 35.83 L25.53 35.79 L25.67 35.74 L25.80 35.70 L25.94 35.65 L26.08 35.60 L26.21 35.55 L26.35 35.50 L26.48 35.44 L26.62 35.39 L26.75 35.34 L26.89 35.28 L27.02 35.22 L27.15 35.16 L27.28 35.11 L27.42 35.04 L27.55 34.98 L27.68 34.92 L27.81 34.86 L27.94 34.79 L28.07 34.72 L28.19 34.66 L28.32 34.59 L28.45 34.52 L28.57 34.45 L28.70 34.38 L28.83 34.30 L28.95 34.23 L29.07 34.15 L29.20 34.08 L29.32 34.00 L29.77 34.43 L30.22 34.84 L30.69 35.25 L31.16 35.66 L31.64 36.06 L32.13 36.45 L32.27 36.34 L32.42 36.24 L32.56 36.13 L32.70 36.03 L32.84 35.92 L32.97 35.81 L33.11 35.70 L33.25 35.59 L33.38 35.47 L33.52 35.36 L33.65 35.25 L33.78 35.13 L33.92 35.01 L34.05 34.89 L34.18 34.77 L34.30 34.65 L34.43 34.53 L34.56 34.41 L34.68 34.28 L34.68 29.00 L22.31 29.00 L22.31 29.00 L22.23 29.02 L22.15 29.03 L22.07 29.05 L21.99 29.06 L21.91 29.07 L21.83 29.09 L21.75 29.10 L21.68 29.11 L21.60 29.12 L21.52 29.13 L21.44 29.14 L21.36 29.15 L21.28 29.16 L21.20 29.17 L21.12 29.17 L21.04 29.18 L20.96 29.18 L20.88 29.19 L20.80 29.19 L20.72 29.19 L20.64 29.20 L20.56 29.20 L20.48 29.20 L20.39 29.20 L20.31 29.20 L20.23 29.20 L20.15 29.20 L20.07 29.19 L19.99 29.19 L19.91 29.19 L19.83 29.18 L19.75 29.18 L19.67 29.17 L19.59 29.16 L19.51 29.16 L19.43 29.15 L19.35 29.14 L19.27 29.13 L19.19 29.12 L19.11 29.11 L19.04 29.10 L18.96 29.09 L18.88 29.07 L18.80 29.06 L18.72 29.05 L18.64 29.03 L18.56 29.01 L18.48 29.00 L18.40 28.98 L18.33 28.96 L18.25 28.94 L18.17 28.93 L18.09 28.91 L18.01 28.89 L17.94 28.86 L17.86 28.84 L17.78 28.82 L17.71 28.80 L17.63 28.77 L17.55 28.75 L17.48 28.72 L17.40 28.70 L17.32 28.67 L17.25 28.64 L17.17 28.62 L17.10 28.59 L17.02 28.56 L16.95 28.53 L16.87 28.50 L16.80 28.47 L16.73 28.43 L16.65 28.40 L16.58 28.37 L16.51 28.34 L16.43 28.30 L16.36 28.27 L16.29 28.23 L16.22 28.19 L16.15 28.16 L16.08 28.12 L16.01 28.08 L15.94 28.04 L15.87 28.00 L15.80 27.96 L15.73 27.92 L15.66 27.88 L15.59 27.84 L15.52 27.80 L15.45 27.76 L15.39 27.71 L15.32 27.67 L15.25 27.62 L15.18 27.58 L15.12 27.53 L15.05 27.49 L14.99 27.44 L14.92 27.39 L14.86 27.34 L14.80 27.30 L14.73 27.25 L14.67 27.20 L14.61 27.15 L14.54 27.10 L14.48 27.04 L14.42 26.99 L14.36 26.94 L14.30 26.89 L14.24 26.83 L14.18 26.78 L14.12 26.73 L14.06 26.67 L14.01 26.61 L13.95 26.56 L13.89 26.50 L13.83 26.44 L13.78 26.39 L13.72 26.33 L13.67 26.27 L13.61 26.21 L13.56 26.15 L13.51 26.09 L13.45 26.03 L13.40 25.97 L13.35 25.91 L13.30 25.85 L13.25 25.79 L13.20 25.72 L13.15 25.66 L13.10 25.60 L13.05 25.53 L13.00 25.47 L12.95 25.40 L12.91 25.34 L12.86 25.27 L12.82 25.21 L12.77 25.14 L12.73 25.07 L12.68 25.01 L12.64 24.94 L12.60 24.87 L12.55 24.80 L12.51 24.73 L12.47 24.67 L12.43 24.60 L12.39 24.53 L12.35 24.46 L12.31 24.39 L12.27 24.31 L12.24 24.24 L12.20 24.17 L12.16 24.10 L12.13 24.03 L12.09 23.96 L12.06 23.88 L12.03 23.81 L11.99 23.74 L11.96 23.66 L11.93 23.59 L11.90 23.52 L11.87 23.44 L11.84 23.37 L11.81 23.29 L11.78 23.22 L11.75 23.14 L11.73 23.07 L11.70 22.99 L11.67 22.91 L11.65 22.84 L11.62 22.76 L11.60 22.69 L11.58 22.61 L11.56 22.53 L11.53 22.45 L11.51 22.38 L11.49 22.30 L11.47 22.22 L11.45 22.14 L11.43 22.06 L11.42 21.99 L11.40 21.91 L11.38 21.83 L11.37 21.75 L11.35 21.67 L11.34 21.59 L11.33 21.51 L11.31 21.43 L11.30 21.35 L11.29 21.28 L11.28 21.20 L11.27 21.12 L11.26 21.04 L11.25 20.96 L11.24 20.88 L11.23 20.80 L11.23 20.72 L11.22 20.64 L11.22 20.56 L11.21 20.48 L11.21 20.40 L11.21 20.32 L11.20 20.24 L11.20 20.16 L11.20 20.08 L11.20 19.99 L11.20 19.91 L11.20 19.83 L11.20 19.75 L11.21 19.67 L11.21 19.59 L11.21 19.51 L11.22 19.43 L11.22 19.35 L11.23 19.27 L11.24 19.19 L11.24 19.11 L11.25 19.03 L11.26 18.95 L11.27 18.87 L11.28 18.79 L11.29 18.71 L11.30 18.64 L11.31 18.56 L11.33 18.48 L11.34 18.40 L11.35 18.32 L11.37 18.24 L11.39 18.16 L11.40 18.08 L11.42 18.00 L11.44 17.93 L11.46 17.85 L11.47 17.77 L11.49 17.69 L11.51 17.61 L11.54 17.54 L11.56 17.46 L11.58 17.38 L11.60 17.31 L11.63 17.23 L11.65 17.15 L11.68 17.08 L11.70 17.00 L11.73 16.92 L11.76 16.85 L11.78 16.77 L11.81 16.70 L11.84 16.62 L11.87 16.55 L11.90 16.47 L11.93 16.40 L11.97 16.33 L12.00 16.25 L12.03 16.18 L12.06 16.11 L12.10 16.03 L12.13 15.96 L12.17 15.89 L12.21 15.82 L12.24 15.75 L12.28 15.68 L12.32 15.61 L12.36 15.54 L12.40 15.47 L12.44 15.40 L12.48 15.33 L12.52 15.26 L12.56 15.19 L12.60 15.12 L12.64 15.05 L12.69 14.99 L12.73 14.92 L12.78 14.85 L12.82 14.78 L12.87 14.72 L12.91 14.65 L12.96 14.59 L13.01 14.52 L13.06 14.46 L13.10 14.40 L13.15 14.33 L13.20 14.27 L13.25 14.21 L13.30 14.14 L13.36 14.08 L13.41 14.02 L13.46 13.96 L13.51 13.90 L13.57 13.84 L13.62 13.78 L13.67 13.72 L13.73 13.66 L13.79 13.61 L13.84 13.55 L13.90 13.49 L13.96 13.43 L14.01 13.38 L14.07 13.32 L14.13 13.27 L14.19 13.21 L14.25 13.16 L14.31 13.11 L14.37 13.05 L14.43 13.00 L14.49 12.95 L14.55 12.90 L14.61 12.85 L14.68 12.80 L14.74 12.75 L14.80 12.70 L14.87 12.65 L14.93 12.60 L15.00 12.55 L15.06 12.51 L15.13 12.46 L15.19 12.42 L15.26 12.37 L15.33 12.33 L15.39 12.28 L15.46 12.24 L15.53 12.20 L15.60 12.15 L15.67 12.11 L15.73 12.07 L15.80 12.03 L15.87 11.99 L15.94 11.95 L16.01 11.91 L16.09 11.87 L16.16 11.84 L16.23 11.80 L16.30 11.76 L16.37 11.73 L16.44 11.69 L16.52 11.66 L16.59 11.63 L16.66 11.59 L16.74 11.56 L16.81 11.53 L16.88 11.50 L16.96 11.47 L17.03 11.44 L17.11 11.41 L17.18 11.38 L17.26 11.35 L17.33 11.33 L17.41 11.30 L17.49 11.27 L17.56 11.25 L17.64 11.22 L17.71 11.20 L17.79 11.18 L17.87 11.16 L17.95 11.13 L18.02 11.11 L18.10 11.09 L18.18 11.07 L18.26 11.05 L18.34 11.03 L18.41 11.02 L18.49 11.00 L18.57 10.98 L18.65 10.97 L18.73 10.95 L18.81 10.94 L18.89 10.93 L18.97 10.91 L19.05 10.90 L19.12 10.89 L19.20 10.88 L19.28 10.87 L19.36 10.86 L19.44 10.85 L19.52 10.84 L19.60 10.83 L19.68 10.83 L19.76 10.82 L19.84 10.82 L19.92 10.81 L20.00 10.81 L20.08 10.81 L20.16 10.80 L20.24 10.80 L20.32 10.80 L20.41 10.80 L20.49 10.80 L20.57 10.80 L20.65 10.80 L20.73 10.81 L20.81 10.81 L20.89 10.81 L20.97 10.82 L21.05 10.82 L21.13 10.83 L21.21 10.84 L21.29 10.84 L21.37 10.85 L21.45 10.86 L21.53 10.87 L21.61 10.88 L21.69 10.89 L21.76 10.90 L21.84 10.91 L21.92 10.93 L22.00 10.94 L22.08 10.95 L22.16 10.97 L22.24 10.99 L22.31 11.00 L34.68 11.00Z";
  function logoSVG(cls,anim){
    const u="lg"+Math.random().toString(36).slice(2,7);
    return `<svg class="${cls}${anim?" lg-anim":""}" viewBox="0 0 133 40" role="img" aria-label="НТЦ МЕТА" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset=".52" style="stop-color:var(--logo-a)"/><stop offset=".52" style="stop-color:var(--logo-b)"/></linearGradient></defs>
      <path class="lg-gear" d="${GEAR_D}" fill="url(#${u})"/>
      <g class="lg-c" fill="none" stroke-width="2.2">
        <path pathLength="1" d="M16 20H128.6"/><path pathLength="1" d="M22 16H38.5L43 10.6"/><path pathLength="1" d="M22 24H38.5L43 29.4"/>
        <circle class="lg-n" cx="130.6" cy="20" r="1.75"/><circle class="lg-n" cx="44.4" cy="9" r="1.75"/><circle class="lg-n" cx="44.4" cy="31" r="1.75"/>
      </g>
      <g class="lg-t" fill="none" stroke-width="2.3">
        <path class="lg-b" d="M54.2 0.6V15.6M66.8 0.6V15.6M54.2 8.1H66.8"/>
        <path class="lg-k" d="M72 1.75H89.5M80.75 1.75V15.6"/>
        <path class="lg-b" d="M95.2 0.6V14.45H111.7V17.4M110.4 0.6V14.45"/>
        <path class="lg-k" d="M54.2 39.4V25.6L61.5 35.2L68.8 25.6V39.4"/>
        <path class="lg-b" d="M89 25.75H77.2V38.25H89M77.2 32H87.6"/>
        <path class="lg-b" d="M92 25.75H109.5M100.75 25.75V39.4"/>
        <path class="lg-b" d="M113.6 39.4L122 25.1L130.4 39.4M116.7 34.1H127.3"/>
      </g></svg>`;
  }
  (function brand(){
    if(document.getElementById("zv-brand"))return;
    const st=document.createElement("style");st.id="zv-brand";
    st.textContent=`
:root{--logo-a:#263c51;--logo-b:#38566e;--logo-t:#00b3ad;
  --accent:#08807b;--accent-ink:#ffffff;--accent-soft:#ddf2f1;--bg:#eef2f5;--line:#d3dce4;--line-strong:#b8c6d2}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--logo-a:#e7eef4;--logo-b:#9fb6c9;--logo-t:#2fd3cb;
  --accent:#3fd0c8;--accent-ink:#04211f;--accent-soft:#103a39;--bg:#0e151c;--line:#26343f;--line-strong:#36475a}}
:root[data-theme="dark"]{--logo-a:#e7eef4;--logo-b:#9fb6c9;--logo-t:#2fd3cb;
  --accent:#3fd0c8;--accent-ink:#04211f;--accent-soft:#103a39;--bg:#0e151c;--line:#26343f;--line-strong:#36475a}
.lg-c path,.lg-c circle,.lg-k{stroke:var(--logo-t)}
.lg-b{stroke:var(--logo-b)}
.login{position:relative}
.brand-hero{position:relative;display:flex;flex-direction:column;align-items:center;gap:18px;padding:28px 12px 8px;text-align:center;isolation:isolate}
.brand-hero::before{content:"";position:absolute;inset:-10% 8% 0;z-index:-1;border-radius:50%;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--logo-t) 18%,transparent),transparent 72%);filter:blur(6px)}
.brand-logo{width:min(400px,84vw);height:auto;display:block;filter:drop-shadow(0 6px 18px color-mix(in srgb,var(--logo-a) 14%,transparent))}
.brand-rule{display:flex;align-items:center;gap:10px;width:min(320px,70vw);color:var(--muted);font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap}
.brand-rule::before,.brand-rule::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--line-strong))}
.brand-rule::after{background:linear-gradient(90deg,var(--line-strong),transparent)}
.login>.head-l{display:none}
.login>p{text-align:center;margin-inline:auto}
.login .login-title{font-family:var(--font-display);font-weight:500;font-size:clamp(17px,2.4vw,20px);margin:0;text-align:center}
.brand-water{position:fixed;right:-120px;bottom:-140px;width:520px;height:520px;opacity:.05;pointer-events:none;z-index:0}
.brand-water path{fill:var(--logo-a)}
.login,.wrap{position:relative;z-index:1}
.head-brand{display:flex;align-items:center;gap:14px;min-width:0}
.head-logo{height:38px;width:auto;flex:none}
.head-sep{width:1px;align-self:stretch;background:var(--line-strong);margin:2px 0}
.setup-logo{width:180px;height:auto}
.lg-anim .lg-gear{transform-box:fill-box;transform-origin:62% 50%;animation:lgSpin 1.1s cubic-bezier(.2,.8,.2,1) both}
.lg-anim .lg-c path{stroke-dasharray:1;animation:lgDraw 1s .35s cubic-bezier(.4,0,.2,1) both}
.lg-anim .lg-n{transform-box:fill-box;transform-origin:center;animation:lgPop .45s 1.15s cubic-bezier(.3,1.6,.5,1) both}
.lg-anim .lg-t{animation:lgFade .7s .25s ease-out both}
@keyframes lgSpin{from{transform:rotate(-70deg);opacity:0}to{transform:none;opacity:1}}
@keyframes lgDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes lgPop{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes lgFade{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.lg-anim *{animation:none!important}}
@media (max-width:600px){.head-logo{height:30px}.head-sep{display:none}.brand-water{width:360px;height:360px;right:-110px;bottom:-110px}}`;
    document.head.appendChild(st);
    document.title="НТЦ МЕТА · Задачі";
    const ls=document.getElementById("loginScreen");
    if(ls&&!ls.querySelector(".brand-hero")){
      ls.insertAdjacentHTML("afterbegin",`<div class="brand-hero">${logoSVG("brand-logo",true)}<div class="brand-rule">Система задач і планів</div></div><h1 class="login-title">Вхід до системи</h1>`);
    }
    const ss=document.getElementById("setupScreen");
    if(ss&&!ss.querySelector(".setup-logo"))ss.insertAdjacentHTML("afterbegin",logoSVG("setup-logo",false));
    const hl=document.querySelector("#app .head-l");
    if(hl&&!document.querySelector(".head-brand")){
      const wrap=document.createElement("div");wrap.className="head-brand";
      hl.parentNode.insertBefore(wrap,hl);wrap.insertAdjacentHTML("afterbegin",logoSVG("head-logo",false)+'<span class="head-sep" aria-hidden="true"></span>');wrap.appendChild(hl);
    }
    if(!document.querySelector(".brand-water"))document.body.insertAdjacentHTML("afterbegin",`<svg class="brand-water" viewBox="0 0 41 40" aria-hidden="true"><path d="${GEAR_D}"/></svg>`);
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
    $("#staffBtn").hidden=!isDir();
    $("#tplBtn").hidden=!isDir();
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
  function closeAll(){[$("#dlg"),$("#pwDlg"),$("#staffDlg"),$("#tplDlg")].forEach(d=>{try{d.close()}catch(e){d.removeAttribute("open")}})}
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
        if(doc){const o=await openObj(keys[d],doc);if(o&&Array.isArray(o.people)){
          let fix=false;
          staff[d]=o.people.map(p=>{if(!p.id){fix=true;return Object.assign({id:uid(),phone:"",note:""},p)}return Object.assign({},p)});
          if(fix&&isDir())saveStaff(d);
        }}
        renderDatalists();
        if($("#staffDlg").open&&!staffForm)renderStaff();
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
  /* ---------- people directory ---------- */
  function saveStaff(d){
    if(!isDir()||!keys[d])return Promise.resolve();
    const list=(staff[d]||[]).slice().sort((x,y)=>x.name.localeCompare(y.name,"uk"));
    staff[d]=list;
    return enqueue("staff-"+d,async()=>{const b=await sealObj(keys[d],{people:list});await fb.set("staff/"+d,{iv:b.iv,ct:b.ct,updatedAt:new Date().toISOString()})}).catch(writeErr);
  }
  function findPerson(pid){
    if(!pid)return null;
    for(const d of DEPTS){const p=(staff[d.id]||[]).find(x=>x.id===pid);if(p)return {p,dept:d.id}}
    return null;
  }
  function linkStaff(list){
    if(!isDir())return;
    const touched=new Set();
    list.forEach(a=>{
      if(a.pid&&findPerson(a.pid))return;
      if(!a.name)return;
      const arr=staff[a.dept]=staff[a.dept]||[];
      let p=arr.find(x=>x.name.toLowerCase()===a.name.toLowerCase());
      if(!p){p={id:uid(),name:a.name,position:a.position||"",phone:"",note:""};arr.push(p);touched.add(a.dept)}
      a.pid=p.id;
    });
    touched.forEach(saveStaff);
  }
  function applyPerson(pid,match){
    const f=findPerson(pid);if(!f)return 0;
    let n=0;
    tasks.forEach(t=>{
      let ch=false;
      t.assignees.forEach(a=>{
        if(a.pid===pid||(match&&!(a.pid&&findPerson(a.pid))&&match(a))){
          if(a.pid!==pid||a.name!==f.p.name||a.position!==f.p.position||a.dept!==f.dept){Object.assign(a,{pid,name:f.p.name,position:f.p.position,dept:f.dept});ch=true}
        }
      });
      if(ch){n++;stamp(t);enqueue(t.id,()=>writeCore(t,true)).catch(writeErr)}
    });
    if(n)render(true);
    return n;
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
      return `<div class="panel empty"><strong>${esc(nm)}: задач ще немає</strong><span>${isDir()?"Додайте задачу кнопкою «Нова задача» або готовий набір кнопкою «Шаблони».":"Директор ще не поставив задачі вашому підрозділу."}</span></div>`;
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
  function personOptions(sel){
    return DEPTS.map(d=>{
      const list=(staff[d.id]||[]).slice().sort((x,y)=>x.name.localeCompare(y.name,"uk"));
      return list.length?`<optgroup label="${d.name}">${list.map(p=>`<option value="${esc(p.id)}" ${p.id===sel?"selected":""}>${esc(p.name)}${p.position?" — "+esc(p.position):""}</option>`).join("")}</optgroup>`:"";
    }).join("");
  }
  function personSelectInner(sel,manual){
    return `<option value="">— оберіть працівника —</option>${personOptions(sel)}<option value="__manual" ${manual?"selected":""}>Вписати вручну…</option>`;
  }
  function asgRow(a){
    const linked=!!(a.pid&&findPerson(a.pid)), manual=!linked&&!!(a.position||a.name), d=a.dept||"vyrobnytstvo";
    return `<div class="asg-row2" data-aid="${esc(a.id)}">
      <div class="asg-pick"><select class="field a-person" aria-label="Працівник">${personSelectInner(linked?a.pid:"",manual)}</select>
        <button class="btn ghost a-del" type="button" aria-label="Прибрати відповідального">✕</button></div>
      <div class="asg-manual" ${manual?"":"hidden"}>
        <select class="field a-dept" aria-label="Підрозділ">${DEPTS.map(x=>`<option value="${x.id}" ${x.id===d?"selected":""}>${x.name}</option>`).join("")}</select>
        <input class="field a-pos" list="pos-${d}" value="${esc(a.position||"")}" placeholder="Посада" aria-label="Посада">
        <input class="field a-name" list="nm-${d}" value="${esc(a.name||"")}" placeholder="ПІБ (буде створено картку)" aria-label="ПІБ">
      </div></div>`;
  }
  function renderAsgEmpty(){const l=$("#asgList");if(!l.querySelector(".asg-row2")&&!l.querySelector(".asg-empty"))l.innerHTML=`<p class="note asg-empty">Додайте хоча б одного відповідального.</p>`}
  function addAsgRow(pid){
    const l=$("#asgList");const em=l.querySelector(".asg-empty");if(em)em.remove();
    const f=pid?findPerson(pid):null;
    l.insertAdjacentHTML("beforeend",asgRow(f?{id:uid(),pid,dept:f.dept,position:f.p.position,name:f.p.name}:{id:uid(),dept:$("#iDept").value}));
    const rows=l.querySelectorAll(".asg-row2");return rows[rows.length-1];
  }
  function refreshPersonSelects(){
    $("#asgList").querySelectorAll(".a-person").forEach(sel=>{const v=sel.value;sel.innerHTML=personSelectInner(v==="__manual"?"":v,v==="__manual");if(v&&v!=="__manual"&&findPerson(v))sel.value=v});
  }
  $("#asgAdd").addEventListener("click",()=>{const r=addAsgRow();r.querySelector(".a-person").focus()});
  $("#asgAdd").insertAdjacentHTML("afterend",' <button class="btn ghost" type="button" id="asgNewPerson">+ Нова картка працівника</button>');
  $("#asgNewPerson").addEventListener("click",()=>openStaff({newDept:$("#iDept").value,fromTask:true}));
  $("#asgList").addEventListener("click",e=>{if(e.target.closest(".a-del")){e.target.closest(".asg-row2").remove();renderAsgEmpty()}});
  $("#asgList").addEventListener("change",e=>{
    const row=e.target.closest(".asg-row2");if(!row)return;
    const man=row.querySelector(".asg-manual");
    if(e.target.classList.contains("a-person")){
      const v=e.target.value;
      if(v==="__manual"){man.hidden=false;row.querySelector(".a-name").focus()}
      else{man.hidden=true;const f=findPerson(v);if(f){row.querySelector(".a-dept").value=f.dept;row.querySelector(".a-pos").value=f.p.position;row.querySelector(".a-name").value=f.p.name}}
    }
    if(e.target.classList.contains("a-dept")){const d=e.target.value;row.querySelector(".a-pos").setAttribute("list","pos-"+d);row.querySelector(".a-name").setAttribute("list","nm-"+d)}
    if(e.target.classList.contains("a-name")){
      const d=row.querySelector(".a-dept").value, nm=e.target.value.trim().toLowerCase();
      const p=(staff[d]||[]).find(x=>x.name.toLowerCase()===nm);
      if(p){row.querySelector(".a-person").value=p.id;man.hidden=true;row.querySelector(".a-pos").value=p.position}
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
      $("#asgList").querySelectorAll(".asg-row2").forEach(r=>{
        const v=r.querySelector(".a-person").value;
        if(v&&v!=="__manual"){const f=findPerson(v);if(f)list.push({id:r.dataset.aid,pid:v,dept:f.dept,position:f.p.position,name:f.p.name});return}
        if(v!=="__manual")return;
        const pos=r.querySelector(".a-pos").value.trim(), name=r.querySelector(".a-name").value.trim();
        if(pos||name)list.push({id:r.dataset.aid,dept:r.querySelector(".a-dept").value,position:pos,name});
      });
      linkStaff(list);
      const isNew=!t;
      const task=t||{id:fb.newId("tasks"),n:tasks.reduce((m,x)=>Math.max(m,x.n||0),0)+1,reps:{},depts:[],assignees:[],tk:null,tkRaw:null};
      Object.assign(task,{title,primary:$("#iDept").value,block:$("#iBlock").value.trim(),due:$("#iDue").value||"",prio:$("#iPrio").value,
        repeat:$("#iRepeat").value,coreStatus:$("#iStatus").value,comment:$("#iComment").value.trim(),assignees:list});
      stamp(task);
      if(isNew)tasks.push(task);
      enqueue(task.id,()=>writeCore(task,true)).then(()=>toast(isNew?"Задачу поставлено":"Збережено"),writeErr);
    }
    closeDlg();render(true);
  });

  /* ---------- people cards (director) ---------- */
  document.body.insertAdjacentHTML("beforeend",`<dialog id="staffDlg" aria-labelledby="staffTitle"><div class="dlg">
    <h2 id="staffTitle">Працівники</h2>
    <p class="note">Картки людей, яких можна призначати відповідальними. Якщо змінити ПІБ, посаду чи підрозділ, це одразу оновиться в усіх задачах працівника.</p>
    <div id="staffBody" class="staff-body"></div>
    <div class="dlg-f"><div class="r"><button class="btn" type="button" id="staffClose">Готово</button></div></div></div></dialog>`);
  $("#settingsBtn").insertAdjacentHTML("beforebegin",`<button class="btn" id="staffBtn" type="button" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.3 3.3 0 0 1 0 6.6M18 14.8c2 .7 3.2 2.4 3.6 5.2"/></svg>Працівники</button>`);
  const staffDlg=$("#staffDlg");
  let staffForm=null, unlinked=[], pendingAssign=false;
  const initials=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase()||"?";
  function openStaff(opts){
    if(!isDir())return;
    staffForm=opts&&opts.newDept?{mode:"new",dept:opts.newDept}:null;
    pendingAssign=!!(opts&&opts.fromTask);
    renderStaff();
    try{staffDlg.showModal()}catch(e){staffDlg.setAttribute("open","")}
  }
  function closeStaff(){staffForm=null;pendingAssign=false;try{staffDlg.close()}catch(e){staffDlg.removeAttribute("open")}}
  $("#staffBtn").addEventListener("click",()=>openStaff(null));
  $("#staffClose").addEventListener("click",closeStaff);
  staffDlg.addEventListener("close",()=>{staffForm=null;pendingAssign=false});
  function personForm(f){
    const ex=f.mode==="edit"?findPerson(f.pid):null;
    const p=ex?ex.p:{name:f.link?f.link.name:"",position:f.link?f.link.position:"",phone:"",note:""};
    const d=f.dept;
    return `<form class="pcard pform" id="pForm" autocomplete="off">
      <div class="grid2">
        <div class="fl"><label for="pfName">ПІБ</label><input class="field" id="pfName" value="${esc(p.name)}" placeholder="Петренко Іван Іванович"></div>
        <div class="fl"><label for="pfPos">Посада</label><input class="field" id="pfPos" list="pos-${d}" value="${esc(p.position)}" placeholder="Напр., Головний інженер"></div>
        <div class="fl"><label for="pfDept">Підрозділ</label><select class="field" id="pfDept">${DEPTS.map(x=>`<option value="${x.id}" ${x.id===d?"selected":""}>${x.name}</option>`).join("")}</select></div>
        <div class="fl"><label for="pfPhone">Телефон</label><input class="field mono" id="pfPhone" type="tel" value="${esc(p.phone||"")}" placeholder="+380…"></div>
      </div>
      <div class="fl"><label for="pfNote">Примітка</label><input class="field" id="pfNote" value="${esc(p.note||"")}" placeholder="Напр., відповідає за верстати з ЧПК"></div>
      ${f.link?`<p class="note">Картку буде прив'язано до задач, де зараз вказано «${esc(personLabel(f.link))}».</p>`:""}
      ${ex&&ex.dept!==undefined?`<p class="note">Задач у працівника: ${tasks.filter(t=>t.assignees.some(a=>a.pid===f.pid)).length}. Зміни застосуються до всіх.</p>`:""}
      <div class="dlg-f"><div id="pfDel">${f.mode==="edit"?'<button class="btn danger" type="button" id="pfDelBtn">Видалити картку</button>':""}</div>
        <div class="r"><button class="btn" type="button" id="pfCancel">Скасувати</button><button class="btn primary" type="submit">Зберегти</button></div></div>
      <div class="err" id="pfErr"></div>
    </form>`;
  }
  function renderStaff(){
    const cnt=pid=>tasks.filter(t=>t.assignees.some(a=>a.pid===pid)).length;
    let html="";
    DEPTS.forEach(d=>{
      const list=(staff[d.id]||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,"uk"));
      const adding=staffForm&&staffForm.mode==="new"&&staffForm.dept===d.id;
      html+=`<section class="staff-sec"><div class="staff-h"><h3>${d.name} <span class="cnt">${list.length}</span></h3><button class="btn" type="button" data-pnew="${d.id}">+ Додати працівника</button></div>
        <div class="pgrid">${adding?personForm(staffForm):""}${list.map(p=>staffForm&&staffForm.mode==="edit"&&staffForm.pid===p.id?personForm(staffForm):
          `<article class="pcard"><div class="pc-top"><span class="avatar">${esc(initials(p.name))}</span><div class="pc-main"><b>${esc(p.name)}</b><span>${esc(p.position||"Посаду не вказано")}</span></div>
            <button class="btn ghost" type="button" data-pedit="${esc(p.id)}">Редагувати</button></div>
            ${p.phone||p.note?`<div class="pc-meta">${p.phone?`<span class="mono">${esc(p.phone)}</span>`:""}${p.note?`<span>${esc(p.note)}</span>`:""}</div>`:""}
            <div class="pc-foot">Задач: ${cnt(p.id)}</div></article>`).join("")}${!list.length&&!adding?'<p class="note">Карток ще немає.</p>':""}</div></section>`;
    });
    const um=new Map();
    tasks.forEach(t=>t.assignees.forEach(a=>{
      if(a.pid&&findPerson(a.pid))return;
      const k=a.dept+"|"+(a.position||"")+"|"+(a.name||"");
      if(!um.has(k))um.set(k,{dept:a.dept,position:a.position||"",name:a.name||"",n:0});
      um.get(k).n++;
    }));
    unlinked=[...um.values()].sort((x,y)=>(x.dept+x.position).localeCompare(y.dept+y.position,"uk"));
    if(unlinked.length){
      html+=`<section class="staff-sec"><div class="staff-h"><h3>Відповідальні без картки <span class="cnt">${unlinked.length}</span></h3></div>
        <p class="note">У цих задачах відповідальний вказаний лише текстом. Створіть картку з ПІБ, і всі ці задачі оновляться автоматично.</p>
        <div class="pgrid">${unlinked.map((u,i)=>staffForm&&staffForm.mode==="link"&&staffForm.key===i?personForm(staffForm):
          `<article class="pcard dashed"><div class="pc-top"><span class="avatar">?</span><div class="pc-main"><b>${esc(u.name||u.position||"Без назви")}</b><span>${u.name?esc(u.position)+" · ":""}${esc(deptName(u.dept))}</span></div>
            <button class="btn" type="button" data-plink="${i}">Створити картку</button></div><div class="pc-foot">Задач: ${u.n}</div></article>`).join("")}</div></section>`;
    }
    $("#staffBody").innerHTML=html;
    const f=$("#pfName");if(f){f.focus();if(f.scrollIntoView)f.scrollIntoView({block:"nearest"})}
  }
  $("#staffBody").addEventListener("click",e=>{
    const t=e.target.closest("button");if(!t)return;
    if(t.dataset.pnew){staffForm={mode:"new",dept:t.dataset.pnew};renderStaff()}
    else if(t.dataset.pedit){const f=findPerson(t.dataset.pedit);if(f){staffForm={mode:"edit",pid:f.p.id,dept:f.dept};renderStaff()}}
    else if(t.dataset.plink!==undefined){const u=unlinked[Number(t.dataset.plink)];if(u){staffForm={mode:"link",key:Number(t.dataset.plink),dept:u.dept,link:u};renderStaff()}}
    else if(t.id==="pfCancel"){staffForm=null;renderStaff()}
    else if(t.id==="pfDelBtn"){$("#pfDel").innerHTML=`<span class="confirm">Видалити картку? У задачах ім'я залишиться текстом. <button class="btn danger" type="button" id="pfDelYes">Так</button><button class="btn" type="button" id="pfDelNo">Ні</button></span>`}
    else if(t.id==="pfDelNo"){$("#pfDel").innerHTML='<button class="btn danger" type="button" id="pfDelBtn">Видалити картку</button>'}
    else if(t.id==="pfDelYes"&&staffForm&&staffForm.mode==="edit"){
      const f=findPerson(staffForm.pid);
      if(f){staff[f.dept]=staff[f.dept].filter(x=>x.id!==f.p.id);saveStaff(f.dept)}
      staffForm=null;renderStaff();renderDatalists();refreshPersonSelects();toast("Картку видалено");
    }
  });
  $("#staffBody").addEventListener("change",e=>{if(e.target.id==="pfDept")$("#pfPos").setAttribute("list","pos-"+e.target.value)});
  $("#staffBody").addEventListener("submit",e=>{
    e.preventDefault();
    if(!staffForm||!isDir())return;
    const name=$("#pfName").value.trim(), pos=$("#pfPos").value.trim(), d=$("#pfDept").value, phone=$("#pfPhone").value.trim(), note=$("#pfNote").value.trim();
    if(!name){$("#pfErr").textContent="Вкажіть ПІБ.";$("#pfName").focus();return}
    let pid;
    if(staffForm.mode==="edit"){
      const f=findPerson(staffForm.pid);if(!f){staffForm=null;renderStaff();return}
      pid=f.p.id;
      const upd=Object.assign({},f.p,{name,position:pos,phone,note});
      staff[f.dept]=(staff[f.dept]||[]).filter(x=>x.id!==pid);
      if(f.dept!==d)saveStaff(f.dept);
      (staff[d]=staff[d]||[]).push(upd);saveStaff(d);
    }else{
      const dup=(staff[d]||[]).find(x=>x.name.toLowerCase()===name.toLowerCase());
      if(dup){$("#pfErr").textContent="Картка з таким ПІБ у цьому підрозділі вже є.";return}
      pid=uid();
      (staff[d]=staff[d]||[]).push({id:pid,name,position:pos,phone,note});saveStaff(d);
    }
    const link=staffForm.mode==="link"?staffForm.link:null;
    const n=applyPerson(pid,link?(a=>a.dept===link.dept&&(a.position||"")===link.position&&(a.name||"")===link.name):null);
    const fromTask=pendingAssign&&staffForm.mode==="new";
    staffForm=null;renderDatalists();refreshPersonSelects();
    if(fromTask&&$("#dlg").open){
      const empty=[...$("#asgList").querySelectorAll(".a-person")].find(s=>!s.value);
      if(empty){empty.value=pid;empty.dispatchEvent(new Event("change",{bubbles:true}))}else addAsgRow(pid);
      pendingAssign=false;closeStaff();toast("Картку створено й додано до задачі");return;
    }
    renderStaff();
    toast(n?"Збережено. Оновлено задач: "+n:"Картку збережено");
  });
  (function(){
    const st=document.createElement("style");
    st.textContent=`
#staffDlg{width:min(900px,calc(100vw - 32px))}
.staff-body{display:flex;flex-direction:column;gap:20px;max-height:min(68vh,680px);overflow:auto;padding-right:2px}
.staff-sec{display:flex;flex-direction:column;gap:8px}
.staff-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.staff-h h3{margin:0;font-family:var(--font-display);font-size:14px;font-weight:500;display:flex;gap:8px;align-items:center}
.staff-h .cnt{font-family:var(--font-mono);font-size:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:0 7px;color:var(--muted)}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}
.pcard{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--surface);display:flex;flex-direction:column;gap:8px;min-width:0}
.pcard.dashed{border-style:dashed;background:var(--surface-2)}
.pform{grid-column:1/-1;border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.pc-top{display:flex;gap:10px;align-items:center}
.avatar{width:38px;height:38px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:700;font-size:13px;flex:none;letter-spacing:.02em}
.pc-main{display:flex;flex-direction:column;min-width:0;flex:1}
.pc-main b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-main span{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-meta{display:flex;flex-direction:column;gap:2px;font-size:12.5px;color:var(--muted)}
.pc-foot{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:6px}
.asg-row2{display:flex;flex-direction:column;gap:8px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
.asg-pick{display:flex;gap:8px;align-items:center}
.asg-pick select{flex:1;min-width:0}
.asg-manual{display:grid;grid-template-columns:150px minmax(0,1fr) minmax(0,1.3fr);gap:8px}
@media (max-width:600px){#staffDlg{width:100vw}.staff-body{max-height:none}.asg-manual{grid-template-columns:1fr}.pgrid{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
  })();

  /* ---------- task templates (director) ---------- */
  const V="vyrobnytstvo", A="administratsiia";
  const ADMIN_TEMPLATE={
    plan:{period:"Листопад – грудень 2026",text:"1. Кадрові документи в повному порядку, військовий облік перевірено.\n2. Проведено ревізію договорів, є реєстр дозволів і ліцензій з термінами дії.\n3. Директор щотижня отримує фінансовий звіт, діє платіжний календар.\n4. Налагоджено документообіг і табель, вакансії закриваються за планом.\n5. Нові працівники проходять адаптацію за єдиним чек-листом."},
    tasks:[
      {block:"Кадри",title:"Перевірити особові справи працівників: трудові договори, накази, заяви — повнота й відповідність",prio:"high",w:3,owners:[[A,"Начальник відділу кадрів"]]},
      {block:"Кадри",title:"Перевірити та впорядкувати військовий облік працівників",prio:"high",w:2,owners:[[A,"Інспектор з кадрів"]]},
      {block:"Кадри",title:"Вести табель робочого часу й передавати його в бухгалтерію до встановленої дати",prio:"high",w:2,repeat:"щомісяця",owners:[[A,"Інспектор з кадрів"],[A,"Бухгалтер"]]},
      {block:"Кадри",title:"Оновити штатний розпис і посадові інструкції для всіх посад",prio:"med",w:4,owners:[[A,"Начальник відділу кадрів"],[V,"Начальник виробництва"]]},
      {block:"Кадри",title:"Скласти графік відпусток на 2027 рік і погодити з керівниками підрозділів",prio:"med",w:6,owners:[[A,"Начальник відділу кадрів"]]},
      {block:"Кадри",title:"Скласти графік медичних оглядів працівників",prio:"med",w:4,owners:[[A,"Інспектор з кадрів"],[V,"Інженер з охорони праці"]]},
      {block:"Юридичні питання",title:"Провести ревізію чинних договорів з постачальниками й клієнтами: терміни, штрафи, пролонгація",prio:"high",w:4,owners:[[A,"Юрист"]]},
      {block:"Юридичні питання",title:"Підготувати типові шаблони договорів: поставка, послуги, конфіденційність",prio:"med",w:4,owners:[[A,"Юрист"]]},
      {block:"Юридичні питання",title:"Скласти реєстр дозволів, ліцензій і сертифікатів підприємства з термінами дії",prio:"med",w:3,owners:[[A,"Юрист"]]},
      {block:"Юридичні питання",title:"Налагодити претензійну роботу з боржниками: шаблони претензій і порядок дій",prio:"med",w:3,owners:[[A,"Юрист"],[A,"Головний бухгалтер"]]},
      {block:"Юридичні питання",title:"Перевірити правила внутрішнього трудового розпорядку й положення про оплату праці на відповідність законодавству",prio:"low",w:6,owners:[[A,"Юрист"],[A,"Начальник відділу кадрів"]]},
      {block:"Бухгалтерія і фінанси",title:"Скласти платіжний календар на місяць: податки, зарплата, постачальники",prio:"high",w:1,repeat:"щомісяця",owners:[[A,"Головний бухгалтер"]]},
      {block:"Бухгалтерія і фінанси",title:"Готувати звіт директору: залишки коштів, дебіторська та кредиторська заборгованість",prio:"high",w:1,repeat:"щотижня",owners:[[A,"Головний бухгалтер"]]},
      {block:"Бухгалтерія і фінанси",title:"Розрахувати фактичну собівартість основних виробів",prio:"high",w:4,owners:[[A,"Бухгалтер-експерт"],[V,"Начальник виробництва"]]},
      {block:"Бухгалтерія і фінанси",title:"Провести звірку взаєморозрахунків з основними контрагентами",prio:"med",w:3,owners:[[A,"Бухгалтер"]]},
      {block:"Бухгалтерія і фінанси",title:"Скласти план податкових звітів і платежів на квартал з термінами",prio:"med",w:2,owners:[[A,"Головний бухгалтер"]]},
      {block:"Бухгалтерія і фінанси",title:"Провести інвентаризацію матеріалів і інструменту на складі",prio:"med",w:6,owners:[[A,"Бухгалтер"],[V,"Комірник"]]},
      {block:"Адміністрування офісу",title:"Налагодити документообіг: реєстр вхідних і вихідних документів, терміни виконання",prio:"med",w:2,owners:[[A,"Адміністратор офісу"]]},
      {block:"Адміністрування офісу",title:"Встановити порядок закупівлі канцтоварів, води й витратних матеріалів з місячним лімітом",prio:"low",w:2,owners:[[A,"Адміністратор офісу"]]},
      {block:"Адміністрування офісу",title:"Скласти довідник контактів і графік роботи підрозділів",prio:"low",w:1,owners:[[A,"Адміністратор офісу"]]},
      {block:"Адміністрування офісу",title:"Організувати резервне копіювання документів і доступи до спільних папок",prio:"med",w:3,owners:[[A,"Адміністратор офісу"]]},
      {block:"HR і розвиток персоналу",title:"Скласти план закриття вакансій: потреба підрозділів, канали пошуку, терміни",prio:"high",w:2,owners:[[A,"HR-менеджер"],[V,"Начальник виробництва"]]},
      {block:"HR і розвиток персоналу",title:"Розробити програму адаптації нових працівників: перший день, наставник, чек-лист",prio:"med",w:4,owners:[[A,"HR-менеджер"]]},
      {block:"HR і розвиток персоналу",title:"Розробити систему оцінки працівників і план навчання на 2027 рік",prio:"med",w:6,owners:[[A,"HR-менеджер"]]},
      {block:"HR і розвиток персоналу",title:"Провести опитування задоволеності працівників і підготувати висновки",prio:"low",w:6,owners:[[A,"HR-менеджер"]]},
      {block:"Управління",title:"Запровадити щотижневу нараду адміністрації за цим трекером",prio:"high",w:1,repeat:"щотижня",owners:[[A,"Директор"]]}
    ]
  };
  const NV="Начальник виробничо-технічного відділу", PV="Помічник начальника ВТВ", MZ="Менеджер із закупівель";
  const VTV_TASKS=[
    {block:"Виробничо-технічний відділ",title:"Сформувати реєстр технічної документації: креслення, техпроцеси, специфікації — з версіями та відповідальними",prio:"high",w:3,owners:[[V,NV],[V,PV]]},
    {block:"Виробничо-технічний відділ",title:"Налагодити порядок запуску замовлення у виробництво: перевірка креслень, техпроцес, норми часу, матеріали",prio:"high",w:2,owners:[[V,NV],[V,"Начальник виробництва"]]},
    {block:"Виробничо-технічний відділ",title:"Вести реєстр замовлень у роботі: стадія, термін, відповідальний",prio:"high",w:1,repeat:"щотижня",owners:[[V,PV]]},
    {block:"Виробничо-технічний відділ",title:"Передавати менеджеру із закупівель потребу в матеріалах і комплектуючих за кожним замовленням",prio:"high",w:1,repeat:"щотижня",owners:[[V,NV],[A,MZ]]},
    {block:"Виробничо-технічний відділ",title:"Розробити й погодити норми витрат матеріалів на основні вироби",prio:"high",w:4,owners:[[V,NV],[A,"Бухгалтер-експерт"]]},
    {block:"Виробничо-технічний відділ",title:"Вести журнал змін у кресленнях і техпроцесах та доводити зміни до цеху під підпис",prio:"med",w:2,owners:[[V,PV]]},
    {block:"Виробничо-технічний відділ",title:"Аналізувати причини браку разом із ВТК і вносити зміни в техпроцеси",prio:"med",w:4,repeat:"щомісяця",owners:[[V,NV],[V,"ВТК / контролер"]]},
    {block:"Виробничо-технічний відділ",title:"Готувати технічні пропозиції й розрахунок трудомісткості для нових замовлень",prio:"med",w:3,owners:[[V,NV],[A,"Менеджер з продажу"]]},
    {block:"Виробничо-технічний відділ",title:"Готувати до наради зведення: статус замовлень, проблеми з документацією й матеріалами",prio:"med",w:1,repeat:"щотижня",owners:[[V,PV]]},
    {block:"Виробничо-технічний відділ",title:"Оцифрувати архів креслень і розмістити його в спільній папці з розмежуванням доступу",prio:"med",w:6,owners:[[V,PV],[A,"Адміністратор офісу"]]},
    {block:"Виробничо-технічний відділ",title:"Скласти план технічного переоснащення й модернізації обладнання",prio:"low",w:6,owners:[[V,NV],[V,"Головний механік"]]},
    {block:"Закупівлі",primary:A,title:"Скласти базу постачальників металу, інструменту й комплектуючих: ціни, терміни, умови оплати",prio:"high",w:2,owners:[[A,MZ]]},
    {block:"Закупівлі",primary:A,title:"Запровадити порядок закупівлі: заявка → погодження → рахунок → оплата → приймання",prio:"high",w:2,owners:[[A,MZ],[A,"Головний бухгалтер"]]},
    {block:"Закупівлі",primary:A,title:"Вести графік поставок, контролювати терміни й завчасно попереджати цех про затримки",prio:"high",w:1,repeat:"щотижня",owners:[[A,MZ],[V,"Начальник виробництва"]]},
    {block:"Закупівлі",primary:A,title:"Узгодити з комірником мінімальні залишки ходового металу й інструменту та порядок дозамовлення",prio:"med",w:3,owners:[[A,MZ],[V,"Комірник"]]},
    {block:"Закупівлі",primary:A,title:"Організувати вхідний контроль поставок разом із ВТК: сертифікати, кількість, якість",prio:"med",w:2,owners:[[A,MZ],[V,"ВТК / контролер"]]},
    {block:"Закупівлі",primary:A,title:"Отримувати щонайменше три комерційні пропозиції на закупівлі понад погоджену суму",prio:"med",w:3,owners:[[A,MZ]]},
    {block:"Закупівлі",primary:A,title:"Перевірити договори з ключовими постачальниками разом з юристом",prio:"med",w:4,owners:[[A,MZ],[A,"Юрист"]]},
    {block:"Закупівлі",primary:A,title:"Проаналізувати витрати на закупівлі за квартал і запропонувати, де зекономити",prio:"med",w:6,owners:[[A,MZ],[A,"Бухгалтер-експерт"]]},
    {block:"Закупівлі",primary:A,title:"Звітувати директору про закупівлі: сума, економія, проблемні постачальники",prio:"med",w:1,repeat:"щомісяця",owners:[[A,MZ]]}
  ];
  function prodTemplate(){
    return (window.SEED_TASKS||[]).map(x=>({block:x.block,title:x.title,prio:x.prio||"med",due:x.due||"",repeat:x.repeat||"",owners:x.owner?[[x.dept,x.owner]]:[],primary:x.dept}));
  }
  const TEMPLATES=[
    {id:"administratsiia",name:"Адміністрація",desc:"Кадри, юрист, бухгалтерія, адміністратор офісу, HR. Частина задач спільна з виробництвом.",primary:A,get:()=>ADMIN_TEMPLATE.tasks,plan:ADMIN_TEMPLATE.plan},
    {id:"vtv",name:"Виробничо-технічний відділ і закупівлі",desc:"Начальник ВТВ і помічник (Виробництво), менеджер із закупівель (Адміністрація). Частина задач спільна з цехом, бухгалтерією та юристом.",primary:V,get:()=>VTV_TASKS,plan:null},
    {id:"vyrobnytstvo",name:"Виробництво",desc:"24 стартові задачі цеху (ті, що додавались під час першого налаштування).",primary:V,get:prodTemplate,plan:null}
  ];
  function dueFromWeeks(w){
    const d=new Date();const dow=(d.getDay()+6)%7;d.setDate(d.getDate()+(7-dow)%7+7*(w||0));
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  const tplKey=(dept,title)=>dept+"|"+String(title).trim().toLowerCase();
  function tplMissing(tp){
    const have=new Set(tasks.map(t=>tplKey(t.primary,t.title)));
    return tp.get().filter(x=>!have.has(tplKey(x.primary||tp.primary,x.title)));
  }
  document.body.insertAdjacentHTML("beforeend",`<dialog id="tplDlg" aria-labelledby="tplTitle"><div class="dlg">
    <h2 id="tplTitle">Шаблони задач</h2>
    <p class="note">Готові набори задач для наради. Додаються лише ті задачі, яких ще немає, тож наявні задачі й звіти не змінюються. Відповідальні додаються посадами: ПІБ можна вписати потім у «Працівники» → «Відповідальні без картки».</p>
    <div id="tplBody" class="tpl-body"></div>
    <div class="dlg-f"><div class="r"><button class="btn" type="button" id="tplClose">Готово</button></div></div></div></dialog>`);
  $("#settingsBtn").insertAdjacentHTML("beforebegin",`<button class="btn" id="tplBtn" type="button" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>Шаблони</button>`);
  const tplDlg=$("#tplDlg"); let tplBusy=false;
  function renderTpl(){
    $("#tplBody").innerHTML=TEMPLATES.map(tp=>{
      const all=tp.get(), miss=tplMissing(tp);
      const shared=all.filter(x=>new Set((x.owners||[]).map(o=>o[0]).concat([x.primary||tp.primary])).size>1).length;
      return `<section class="tpl"><div class="tpl-h"><div><h3>${esc(tp.name)}</h3><p class="note">${esc(tp.desc)}</p></div>
        <button class="btn primary" type="button" data-tpl="${tp.id}" ${miss.length&&!tplBusy?"":"disabled"}>${miss.length?"Додати "+miss.length+" задач":"Уже додано"}</button></div>
        <div class="tpl-meta"><span>Усього в шаблоні: ${all.length}</span>${shared?`<span>Спільних з іншим підрозділом: ${shared}</span>`:""}${tp.plan?`<span>Містить план підрозділу${plans[tp.primary]&&plans[tp.primary].text?" (у вас уже є план — його не змінимо)":""}</span>`:""}</div>
        <details><summary>Переглянути задачі</summary><ul class="tpl-list">${all.map(x=>`<li><span class="tpl-blk">${esc(x.block)}</span> ${esc(x.title)} <span class="note">— ${esc((x.owners||[]).map(o=>o[1]).join(", "))}</span></li>`).join("")}</ul></details></section>`;
    }).join("");
  }
  $("#tplBtn").addEventListener("click",()=>{if(!isDir())return;renderTpl();try{tplDlg.showModal()}catch(e){tplDlg.setAttribute("open","")}});
  $("#tplClose").addEventListener("click",()=>{try{tplDlg.close()}catch(e){tplDlg.removeAttribute("open")}});
  $("#tplBody").addEventListener("click",async e=>{
    const b=e.target.closest("[data-tpl]");if(!b||tplBusy||!isDir())return;
    const tp=TEMPLATES.find(x=>x.id===b.dataset.tpl);if(!tp)return;
    const miss=tplMissing(tp);if(!miss.length)return;
    tplBusy=true;renderTpl();
    let n=tasks.reduce((m,x)=>Math.max(m,x.n||0),0), done=0;
    try{
      for(const x of miss){
        n++;
        const t={id:fb.newId("tasks"),n,primary:x.primary||tp.primary,title:x.title,block:x.block,due:x.due||dueFromWeeks(x.w),prio:x.prio||"med",repeat:x.repeat||"",comment:"",coreStatus:"todo",
          assignees:(x.owners||[]).map(o=>({id:uid(),dept:o[0],position:o[1],name:""})),reps:{},depts:[],tk:null,tkRaw:null};
        stamp(t);
        await enqueue(t.id,()=>writeCore(t,true));
        done++;b.textContent="Додано "+done+" з "+miss.length+"…";
      }
      if(tp.plan&&!(plans[tp.primary]&&plans[tp.primary].text)){
        const at=new Date().toISOString(), obj={text:tp.plan.text,period:tp.plan.period};
        plans[tp.primary]=Object.assign({},obj,{updatedAt:at});
        await enqueue("plan-"+tp.primary,async()=>{const box=await sealObj(keys[tp.primary],obj);await fb.set("plans/"+tp.primary,{iv:box.iv,ct:box.ct,updatedAt:at,updatedBy:role})});
      }
      toast("Додано задач: "+done);
    }catch(ex){writeErr(ex)}
    tplBusy=false;setTimeout(()=>{renderTpl();render(true)},600);
  });
  (function(){
    const st=document.createElement("style");
    st.textContent=`#tplDlg{width:min(760px,calc(100vw - 32px))}
.tpl-body{display:flex;flex-direction:column;gap:14px;max-height:min(66vh,640px);overflow:auto}
.tpl{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--surface)}
.tpl-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.tpl-h h3{margin:0 0 4px;font-family:var(--font-display);font-size:15px;font-weight:500}
.tpl-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.tpl details summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:13px}
.tpl-list{margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:5px;font-size:13px}
.tpl-blk{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
@media (max-width:600px){#tplDlg{width:100vw}.tpl-body{max-height:none}}`;
    document.head.appendChild(st);
  })();

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
