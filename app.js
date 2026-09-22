const APP_VERSION = '0.1.0-beta';
const STORAGE_KEY = 'gymTrackerLuca.v1';

const routines = {
  A: [
    cardio('warmup-a','Riscaldamento cardio','warmup',8,10),
    strength('a-legpress','Leg Press','Gambe',2,12,15,90,70,2.5,'high'),
    strength('a-legcurl','Leg Curl','Gambe',2,12,15,75,35,2.5,'medium'),
    strength('a-chest','Chest Press','Petto',2,10,12,90,40,2.5,'high'),
    strength('a-lat','Lat Machine','Schiena',2,10,12,90,40,2.5,'high'),
    strength('a-shoulder','Shoulder Press','Spalle',2,10,12,75,25,2.5,'medium'),
    strength('a-curl','Curl ai cavi','Bicipiti',2,12,15,60,15,2.5,'low'),
    strength('a-triceps','Tricipiti ai cavi','Tricipiti',2,12,15,60,20,2.5,'low'),
    cardio('final-a','Cardio finale','final',12,15)
  ],
  B: [
    cardio('warmup-b','Riscaldamento cardio','warmup',8,10),
    strength('b-legpress','Leg Press','Gambe',2,12,15,90,70,2.5,'high'),
    strength('b-legcurl','Leg Curl','Gambe',2,12,15,75,35,2.5,'medium'),
    strength('b-row','Low Row','Schiena',2,10,12,90,35,2.5,'high'),
    strength('b-incline','Chest Press inclinata','Petto',2,10,12,90,35,2.5,'high'),
    strength('b-lateral','Alzate laterali','Spalle',2,12,15,60,7.5,1,'medium'),
    strength('b-curl','Curl bicipiti','Bicipiti',2,12,15,60,15,2.5,'low'),
    strength('b-triceps','Tricipiti ai cavi','Tricipiti',2,12,15,60,20,2.5,'low'),
    strength('b-abs','Abdominal machine','Addome',2,12,15,60,25,2.5,'low'),
    cardio('final-b','Cardio finale','final',12,15)
  ],
  C: [
    cardio('warmup-c','Riscaldamento cardio','warmup',8,10),
    strength('c-legpress','Pressa 45° / Leg Press','Gambe',2,12,15,90,70,2.5,'high'),
    strength('c-legext','Leg Extension','Gambe',2,12,15,75,30,2.5,'medium'),
    strength('c-chest','Chest Press','Petto',2,10,12,90,40,2.5,'high'),
    strength('c-lat','Lat Machine','Schiena',2,10,12,90,40,2.5,'high'),
    strength('c-row','Low Row','Schiena',2,10,12,90,35,2.5,'high'),
    strength('c-shoulder','Shoulder Press','Spalle',2,10,12,75,25,2.5,'medium'),
    strength('c-curl','Curl bicipiti','Bicipiti',2,12,15,60,15,2.5,'low'),
    strength('c-triceps','Tricipiti ai cavi','Tricipiti',2,12,15,60,20,2.5,'low'),
    strength('c-crunch','Crunch / addome','Addome',2,12,15,60,0,0,'low'),
    cardio('final-c','Cardio finale','final',12,15)
  ]
};

function strength(id,name,group,sets,minReps,maxReps,rest,defaultWeight,step,priority){
  return {id,type:'strength',name,group,sets,minReps,maxReps,rest,defaultWeight,step,priority};
}
function cardio(id,name,kind,minMinutes,maxMinutes){
  return {id,type:'cardio',name,kind,minMinutes,maxMinutes,group:'Cardio'};
}

const defaults = {
  profile:{age:43,height:168,startWeight:104,goal:'Dimagrimento'},
  currentWorkout:null,
  timer:null,
  history:[],
  measurements:[{date:new Date().toISOString().slice(0,10),weight:104,waist:null}],
  settings:{crowded:false,lastRoutine:'A'},
  appVersion:APP_VERSION
};

let state = loadState();
let route = 'home';
let activeItemId = null;
let modal = null;
let ticker = null;

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaults);
    const parsed=JSON.parse(raw);
    return {...structuredClone(defaults),...parsed,settings:{...defaults.settings,...parsed.settings}};
  }catch{return structuredClone(defaults)}
}
function save(){state.appVersion=APP_VERSION;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function cloneRoutine(letter){
  return routines[letter].map((x,idx)=>({
    ...x, orderPlanned:idx+1, status:'todo', actualOrder:null,
    setsDone:x.type==='strength'?Array.from({length:x.sets},()=>null):undefined,
    cardioData:x.type==='cardio'?{machine:'Tapis roulant',minutes:null,distance:null,incline:null,resistance:null,heartRate:null,effort:'Giusto'}:undefined
  }));
}
function today(){return new Date().toISOString().slice(0,10)}
function fmtSec(s){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function elapsedText(ms){const s=Math.floor(ms/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function currentRoutineLetter(){return state.currentWorkout?.routine || state.settings.lastRoutine || 'A'}
function currentItems(){return state.currentWorkout?.items || []}
function itemById(id){return currentItems().find(x=>String(x.id)===String(id))}
function setStatusClass(s){return ['todo','active','done','occupied','skipped'].includes(s)?s:'todo'}
function completedCount(){return currentItems().filter(x=>x.status==='done').length}
function nextActualOrder(){return 1+currentItems().filter(x=>x.actualOrder!=null).length}

function startWorkout(letter){
  state.currentWorkout={id:crypto.randomUUID?.()||String(Date.now()),routine:letter,date:today(),startedAt:Date.now(),endedAt:null,items:cloneRoutine(letter),notes:'',crowded:state.settings.crowded};
  state.settings.lastRoutine=letter;activeItemId=null;save();route='workout';render();
}
function endWorkout(force=false){
  if(!state.currentWorkout)return;
  const pending=currentItems().filter(x=>!['done','skipped'].includes(x.status));
  if(pending.length&&!force){modal={type:'finish',pending};render();return}
  const finished={...state.currentWorkout,endedAt:Date.now()};
  state.history.unshift(finished);state.history=state.history.slice(0,100);
  state.currentWorkout=null;state.timer=null;activeItemId=null;save();modal=null;route='home';render();
}
function startStandaloneCardio(){
  state.currentWorkout={id:crypto.randomUUID?.()||String(Date.now()),routine:'CARDIO',date:today(),startedAt:Date.now(),endedAt:null,crowded:false,items:[{id:'cardio-only',type:'cardio',name:'Solo cardio',kind:'standalone',group:'Cardio',status:'active',actualOrder:1,cardioData:{machine:'Camminata outdoor',minutes:null,distance:null,incline:null,resistance:null,heartRate:null,effort:'Giusto'}}]};
  activeItemId='cardio-only';save();route='workout';render();
}

function activateItem(item){
  if(item.status==='done'||item.status==='skipped') return;
  const blockedGroup = findPendingGroupContext();
  if(item.type==='strength' && blockedGroup && item.group!==blockedGroup.group && !state.currentWorkout.crowded){
    const alternative=currentItems().find(x=>x.type==='strength'&&x.group===blockedGroup.group&&['todo','active'].includes(x.status)&&x.id!==item.id);
    if(alternative){modal={type:'groupwarn',targetId:item.id,group:blockedGroup.group,source:blockedGroup.name,alternative:alternative.name};render();return}
  }
  currentItems().forEach(x=>{if(x.status==='active'&&x.id!==item.id)x.status='todo'});
  if(item.status==='occupied') item.status='todo';
  item.status='active';
  if(item.actualOrder==null)item.actualOrder=nextActualOrder();
  activeItemId=item.id;save();render();
}
function findPendingGroupContext(){
  const occ=currentItems().find(x=>x.type==='strength'&&x.status==='occupied');
  if(occ)return {group:occ.group,name:occ.name};
  const act=currentItems().find(x=>x.type==='strength'&&x.status==='active');
  if(act)return {group:act.group,name:act.name};
  return null;
}
function markOccupied(item){item.status='occupied';activeItemId=null;save();render()}
function markSkipped(item){item.status='skipped';activeItemId=null;save();render()}

function previousPerformance(item){
  for(const h of state.history){
    const found=h.items?.find(x=>x.id===item.id && x.type==='strength' && x.setsDone?.some(Boolean));
    if(found)return found;
  }
  return null;
}
function previousWeight(item){
  const prev=previousPerformance(item);
  if(prev){
    const vals=prev.setsDone.filter(Boolean).map(s=>Number(s.weight)).filter(Number.isFinite);
    if(vals.length)return vals[vals.length-1];
  }
  return item.defaultWeight||0;
}
function inheritedWeight(item,setIndex){
  for(let i=setIndex-1;i>=0;i--){const s=item.setsDone[i];if(s&&Number.isFinite(Number(s.weight)))return Number(s.weight)}
  return previousWeight(item);
}
function completeSet(item,index){
  const weightEl=document.querySelector(`#weight-${index}`),repsEl=document.querySelector(`#reps-${index}`);
  const weight=Number(weightEl?.value),reps=Number(repsEl?.value);
  if(!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<=0){modal={type:'info',title:'Controlla i dati',text:'Inserisci un peso valido e il numero di ripetizioni.'};render();return}
  item.setsDone[index]={weight,reps,doneAt:Date.now()};
  // Eredita immediatamente il nuovo peso sulle serie successive ancora vuote.
  for(let i=index+1;i<item.setsDone.length;i++){
    if(!item.setsDone[i]) item.prefillWeight=weight;
  }
  startRest(item.rest,item.name);
  if(item.setsDone.every(Boolean)){
    item.status='done';
    item.effort=item.effort||'Giusto';
  }
  save();render();
}
function startRest(seconds,exerciseName){
  const now=Date.now();state.timer={exerciseName,durationSec:seconds,startedAt:now,endsAt:now+seconds*1000};save();startTicker();
}
function stopTimer(){state.timer=null;save();render()}
function timerInfo(){
  if(!state.timer)return null;
  const now=Date.now(),diff=state.timer.endsAt-now;
  if(diff>0)return {mode:'down',seconds:Math.ceil(diff/1000)};
  return {mode:'up',seconds:Math.floor((-diff)/1000)};
}
function startTicker(){clearInterval(ticker);ticker=setInterval(()=>{if(state.timer)renderTimerOnly();},1000)}
function renderTimerOnly(){
  const box=document.querySelector('#timer-box');if(!box)return;
  const info=timerInfo();if(!info)return;
  const val=box.querySelector('.timer-value');const lab=box.querySelector('.timer-label');
  box.classList.toggle('down',info.mode==='down');box.classList.toggle('up',info.mode==='up');
  if(val)val.textContent=(info.mode==='up'?'+':'')+fmtSec(info.seconds);
  if(lab)lab.textContent=info.mode==='up'?'TEMPO EXTRA':'RECUPERO';
}

function recommendation(item){
  if(item.type!=='strength')return null;
  const completed=item.setsDone?.filter(Boolean)||[];
  if(!completed.length)return {label:'Dati insufficienti',tone:'muted',detail:'Completa l’esercizio per avere un suggerimento.'};
  const allHigh=completed.every(s=>s.reps>=item.maxReps);
  const anyBelow=completed.some(s=>s.reps<item.minReps);
  const effort=item.effort||'Giusto';
  if(allHigh&&(effort==='Facile'||effort==='Giusto')) return {label:'Possibile aumento',tone:'ok',detail:`Valuta +${item.step||2.5} kg nella prossima seduta se il risultato si conferma.`};
  if(anyBelow&&effort==='Difficile') return {label:'Mantieni / valuta riduzione',tone:'warn',detail:'Non aumentare. Se succede di nuovo, valuta un piccolo calo del carico.'};
  return {label:'Mantieni',tone:'muted',detail:'Resta sul carico attuale e consolida le ripetizioni.'};
}

function cardioFields(item){
  const d=item.cardioData||{};
  const outdoor=d.machine==='Camminata outdoor';
  const dist=Number(d.distance);
  const mins=Number(d.minutes);
  let pace='—',speed='—';
  if(dist>0&&mins>0){const totalSec=mins*60/dist;pace=`${Math.floor(totalSec/60)}:${String(Math.round(totalSec%60)).padStart(2,'0')} min/km`;speed=`${(dist/(mins/60)).toFixed(1)} km/h`}
  return `<div class="stack">
    <label>Tipo<select id="cardio-machine"><option${d.machine==='Tapis roulant'?' selected':''}>Tapis roulant</option><option${d.machine==='Cyclette'?' selected':''}>Cyclette</option><option${d.machine==='Crosstrainer'?' selected':''}>Crosstrainer</option><option${d.machine==='Scala'?' selected':''}>Scala</option><option${d.machine==='Camminata outdoor'?' selected':''}>Camminata outdoor</option><option${d.machine==='Altro'?' selected':''}>Altro</option></select></label>
    <div class="grid2"><label>Durata (min)<input id="cardio-min" type="number" min="1" value="${d.minutes??''}" placeholder="15"></label><label>Distanza (km)<input id="cardio-dist" type="number" min="0" step="0.01" value="${d.distance??''}" placeholder="facoltativa"></label></div>
    ${!outdoor?`<div class="grid2"><label>Inclinazione %<input id="cardio-incline" type="number" step="0.5" value="${d.incline??''}" placeholder="facoltativa"></label><label>Resistenza / livello<input id="cardio-resistance" type="number" step="1" value="${d.resistance??''}" placeholder="facoltativo"></label></div>`:''}
    <label>Frequenza cardiaca media<input id="cardio-hr" type="number" min="30" max="220" value="${d.heartRate??''}" placeholder="facoltativa"></label>
    <label>Sensazione<select id="cardio-effort"><option${d.effort==='Facile'?' selected':''}>Facile</option><option${d.effort==='Giusto'?' selected':''}>Giusto</option><option${d.effort==='Difficile'?' selected':''}>Difficile</option></select></label>
    ${outdoor?`<div class="notice"><strong>Calcolo automatico</strong><br>Passo medio: ${pace}<br>Velocità media: ${speed}</div>`:''}
  </div>`;
}
function saveCardio(item){
  const g=id=>document.querySelector(id);
  item.cardioData={machine:g('#cardio-machine').value,minutes:Number(g('#cardio-min').value)||null,distance:Number(g('#cardio-dist').value)||null,incline:Number(g('#cardio-incline')?.value)||null,resistance:Number(g('#cardio-resistance')?.value)||null,heartRate:Number(g('#cardio-hr').value)||null,effort:g('#cardio-effort').value};
  if(!item.cardioData.minutes){modal={type:'info',title:'Durata mancante',text:'Inserisci almeno la durata del cardio.'};render();return}
  item.status='done';activeItemId=null;save();
  if(state.currentWorkout.routine==='CARDIO') endWorkout(true); else render();
}

function render(){
  const app=document.querySelector('#app');
  app.innerHTML=`<header class="topbar"><div class="row between"><div><div class="brand">GYM TRACKER LUCA</div><div class="title">${pageTitle()}</div></div><span class="pill">Beta ${APP_VERSION}</span></div></header><main class="container">${timerHtml()}${pageHtml()}</main>${bottomNav()}${modalHtml()}`;
  wire();
  if(state.timer)startTicker();
}
function pageTitle(){if(route==='home')return 'Home';if(route==='workout')return state.currentWorkout?.routine==='CARDIO'?'Solo cardio':`Scheda ${currentRoutineLetter()}`;if(route==='history')return 'Storico';if(route==='progress')return 'Progressi';return 'Gym Tracker'}
function timerHtml(){
  const t=timerInfo();if(!t)return '';
  return `<div id="timer-box" class="timer ${t.mode==='down'?'down':'up'}"><div><div class="small timer-label">${t.mode==='down'?'RECUPERO':'TEMPO EXTRA'}</div><div class="timer-value">${t.mode==='up'?'+':''}${fmtSec(t.seconds)}</div><div class="small muted">${esc(state.timer.exerciseName||'')}</div></div><div class="stack" style="gap:6px"><button class="btn" data-act="timer-plus">+30s</button><button class="btn" data-act="timer-stop">Chiudi</button></div></div>`
}
function pageHtml(){if(route==='home')return homeHtml();if(route==='workout')return workoutHtml();if(route==='history')return historyHtml();if(route==='progress')return progressHtml();return homeHtml()}
function homeHtml(){
  const last=state.history[0];
  return `<div class="stack">
    ${state.currentWorkout?`<div class="notice warn"><strong>Allenamento in corso</strong><br>${state.currentWorkout.routine==='CARDIO'?'Solo cardio':'Scheda '+state.currentWorkout.routine} · iniziato ${new Date(state.currentWorkout.startedAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div><button class="btn primary full" data-act="resume">RIPRENDI ALLENAMENTO</button>`:''}
    <section class="card"><div class="small muted">Allenamento programmato</div><div class="big">Scheda ${state.settings.lastRoutine||'A'}</div><div class="small muted">Riscaldamento + pesi + cardio finale</div><div class="grid3" style="margin-top:14px"><button class="btn primary" data-act="start" data-r="A">A</button><button class="btn primary" data-act="start" data-r="B">B</button><button class="btn primary" data-act="start" data-r="C">C</button></div></section>
    <button class="btn full" data-act="cardio-only">SOLO CARDIO</button>
    <div class="grid2"><section class="card"><div class="small muted">Ultimo peso</div><div class="big">${latestWeight()} kg</div></section><section class="card"><div class="small muted">Sessioni registrate</div><div class="big">${state.history.length}</div></section></div>
    <section class="card"><div class="section-title">Ultima attività</div>${last?`<div class="strong">${last.routine==='CARDIO'?'Solo cardio':'Scheda '+last.routine}</div><div class="small muted">${new Date(last.startedAt).toLocaleString('it-IT')}</div>`:'<div class="small muted">Nessuna attività registrata.</div>'}</section>
  </div>`
}
function workoutHtml(){
  if(!state.currentWorkout)return `<div class="notice">Nessun allenamento attivo.</div>`;
  const item=activeItemId?itemById(activeItemId):null;
  if(item)return itemDetailHtml(item);
  return workoutListHtml();
}
function workoutListHtml(){
  const w=state.currentWorkout;
  return `<div class="stack"><div class="row between wrap"><div><div class="strong">${completedCount()} / ${currentItems().length} completati</div><div class="small muted">Tocca un esercizio per aprirlo.</div></div>${w.routine!=='CARDIO'?`<label class="row" style="display:flex;color:white"><input id="crowded" type="checkbox" style="width:22px" ${w.crowded?'checked':''}> Palestra affollata</label>`:''}</div>
  ${currentItems().map(x=>`<button class="exercise" data-act="open-item" data-id="${esc(x.id)}"><div class="row between"><div class="row"><span class="status ${setStatusClass(x.status)}"></span><div><div class="strong">${esc(x.name)}</div><div class="meta">${x.type==='cardio'?`${x.minMinutes??''}${x.maxMinutes?`–${x.maxMinutes}`:''} min`: `${esc(x.group)} · ${x.sets} × ${x.minReps}–${x.maxReps}`}</div></div></div><div class="small muted">${x.status==='occupied'?'da recuperare':x.status==='done'?'fatto':'apri'}</div></div></button>`).join('')}
  <button class="btn full" data-act="finish">TERMINA ALLENAMENTO</button></div>`
}
function itemDetailHtml(item){
  if(item.type==='cardio')return `<div class="stack"><button class="btn ghost" data-act="back-list">← Lista</button><section class="card"><div class="small muted">Cardio</div><div class="big">${esc(item.name)}</div>${item.kind!=='standalone'?`<div class="small muted">Obiettivo ${item.minMinutes}–${item.maxMinutes} min</div>`:''}<div style="margin-top:14px">${cardioFields(item)}</div><button class="btn primary full" style="margin-top:14px" data-act="save-cardio">✓ COMPLETA CARDIO</button></section></div>`;
  const prev=previousPerformance(item);const rec=recommendation(item);
  return `<div class="stack"><button class="btn ghost" data-act="back-list">← Lista</button><section class="card"><div class="small muted">${esc(item.group)} · priorità ${esc(item.priority)}</div><div class="big">${esc(item.name)}</div><div class="grid2" style="margin-top:12px"><div class="subcard"><div class="small muted">Ultima volta</div><div class="strong">${prev?formatPrev(prev):`${previousWeight(item)} kg`}</div></div><div class="subcard"><div class="small muted">Obiettivo</div><div class="strong">${item.sets} × ${item.minReps}–${item.maxReps}</div><div class="small muted">rec. ${item.rest}s</div></div></div>
  <div class="stack" style="margin-top:14px">${item.setsDone.map((s,i)=>setHtml(item,s,i)).join('')}</div>
  <div class="section-title" style="margin-top:14px">Sensazione esercizio</div><div class="grid3"><button class="btn ${item.effort==='Facile'?'ok':''}" data-act="effort" data-v="Facile">Facile</button><button class="btn ${item.effort==='Giusto'?'primary':''}" data-act="effort" data-v="Giusto">Giusto</button><button class="btn ${item.effort==='Difficile'?'warn':''}" data-act="effort" data-v="Difficile">Difficile</button></div>
  ${rec?`<div class="notice ${rec.tone==='ok'?'ok':rec.tone==='warn'?'warn':''}" style="margin-top:12px"><strong>${esc(rec.label)}</strong><br>${esc(rec.detail)}</div>`:''}
  <div class="grid2" style="margin-top:14px"><button class="btn warn" data-act="occupied">OCCUPATA</button><button class="btn" data-act="skip">SALTA</button></div></section></div>`
}
function setHtml(item,s,i){
  const prefill=s?.weight ?? item.prefillWeight ?? inheritedWeight(item,i);
  return `<div class="setrow ${s?'setdone':''}"><div class="row between"><div class="strong">Serie ${i+1}</div><div>${s?'✅':''}</div></div><div class="grid2" style="margin-top:10px"><label>Peso kg<input id="weight-${i}" type="number" min="0" step="${item.step||1}" value="${prefill}"></label><label>Ripetizioni<input id="reps-${i}" type="number" min="1" max="50" value="${s?.reps??''}" placeholder="${item.minReps}"></label></div><div class="quick" style="margin-top:8px"><button data-act="weight-delta" data-i="${i}" data-d="-${item.step||1}">−${item.step||1}</button><button data-act="weight-delta" data-i="${i}" data-d="${item.step||1}">+${item.step||1}</button><button data-act="rep-set" data-i="${i}" data-r="${item.minReps}">${item.minReps}</button><button data-act="rep-set" data-i="${i}" data-r="${item.maxReps}">${item.maxReps}</button></div><button class="btn ${s?'':'primary'} full" style="margin-top:9px" data-act="complete-set" data-i="${i}" ${s?'disabled':''}>${s?'COMPLETATA':'✓ COMPLETA SERIE'}</button></div>`
}
function formatPrev(prev){const vals=prev.setsDone.filter(Boolean);if(!vals.length)return '—';return `${vals[vals.length-1].weight} kg · ${vals.map(s=>s.reps).join(' / ')}`}
function historyHtml(){
  return `<div class="stack">${state.history.length?state.history.map(h=>`<section class="card"><div class="row between"><div><div class="strong">${h.routine==='CARDIO'?'Solo cardio':'Scheda '+h.routine}</div><div class="small muted">${new Date(h.startedAt).toLocaleString('it-IT')}</div></div><span class="pill">${Math.max(1,Math.round((h.endedAt-h.startedAt)/60000))} min</span></div><div class="small muted" style="margin-top:9px">${h.items.filter(x=>x.status==='done').length}/${h.items.length} attività completate</div></section>`).join(''):'<div class="notice">Nessun allenamento registrato.</div>'}</div>`
}
function latestWeight(){const vals=state.measurements.filter(x=>Number(x.weight)>0).sort((a,b)=>b.date.localeCompare(a.date));return vals[0]?.weight??104}
function progressHtml(){
  const m=state.measurements.slice().sort((a,b)=>a.date.localeCompare(b.date));const weights=m.map(x=>Number(x.weight)).filter(Number.isFinite);const min=Math.min(...weights,0),max=Math.max(...weights,1);return `<div class="stack"><section class="card"><div class="section-title">Registra misure</div><div class="grid2"><label>Peso kg<input id="m-weight" type="number" step="0.1" value="${latestWeight()}"></label><label>Vita cm<input id="m-waist" type="number" step="0.5" placeholder="facoltativa"></label></div><button class="btn primary full" style="margin-top:12px" data-act="save-measure">SALVA</button></section><section class="card"><div class="section-title">Peso</div><div class="big">${latestWeight()} kg</div><div class="chart">${m.slice(-8).map((x,i)=>{const v=Number(x.weight);const pct=max===min?60:20+60*(v-min)/(max-min);return `<div class="bar" style="height:${pct}%"><span>${i+1}</span></div>`}).join('')}</div></section><section class="card"><div class="section-title">Misure registrate</div>${m.slice().reverse().slice(0,8).map(x=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid #273449"><span>${x.date}</span><span>${x.weight} kg${x.waist?` · ${x.waist} cm`:''}</span></div>`).join('')}</section></div>`
}
function bottomNav(){return `<nav class="bottomnav"><button class="navbtn ${route==='home'?'active':''}" data-nav="home">Home</button><button class="navbtn ${route==='workout'?'active':''}" data-nav="workout">Allenamento</button><button class="navbtn ${route==='history'?'active':''}" data-nav="history">Storico</button><button class="navbtn ${route==='progress'?'active':''}" data-nav="progress">Progressi</button></nav>`}
function modalHtml(){if(!modal)return '';if(modal.type==='groupwarn')return `<div class="modal-wrap"><div class="modal"><div class="big" style="font-size:21px">Cambio gruppo muscolare</div><p class="muted">Hai lasciato <strong>${esc(modal.source)}</strong> in sospeso. È ancora disponibile un esercizio per <strong>${esc(modal.group)}</strong>: ${esc(modal.alternative)}.</p><div class="grid2"><button class="btn" data-act="modal-close">Torna</button><button class="btn primary" data-act="modal-continue">Continua</button></div></div></div>`;if(modal.type==='finish')return `<div class="modal-wrap"><div class="modal"><div class="big" style="font-size:21px">Allenamento non completo</div><p class="muted">Restano ${modal.pending.length} attività.</p><div class="grid2"><button class="btn" data-act="modal-close">Torna</button><button class="btn primary" data-act="finish-force">Termina comunque</button></div></div></div>`;return `<div class="modal-wrap"><div class="modal"><div class="big" style="font-size:21px">${esc(modal.title)}</div><p class="muted">${esc(modal.text)}</p><button class="btn primary full" data-act="modal-close">OK</button></div></div>`}

function wire(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{const n=b.dataset.nav;if(n==='workout'&&!state.currentWorkout){route='home'}else route=n;activeItemId=null;render()});
  document.querySelectorAll('[data-act]').forEach(b=>{
    const a=b.dataset.act;
    if(a==='start')b.onclick=()=>startWorkout(b.dataset.r);
    if(a==='resume')b.onclick=()=>{route='workout';render()};
    if(a==='cardio-only')b.onclick=startStandaloneCardio;
    if(a==='open-item')b.onclick=()=>activateItem(itemById(b.dataset.id));
    if(a==='back-list')b.onclick=()=>{activeItemId=null;save();render()};
    if(a==='occupied')b.onclick=()=>markOccupied(itemById(activeItemId));
    if(a==='skip')b.onclick=()=>markSkipped(itemById(activeItemId));
    if(a==='complete-set')b.onclick=()=>completeSet(itemById(activeItemId),Number(b.dataset.i));
    if(a==='weight-delta')b.onclick=()=>{const el=document.querySelector(`#weight-${b.dataset.i}`);el.value=Math.max(0,(Number(el.value)||0)+Number(b.dataset.d));};
    if(a==='rep-set')b.onclick=()=>{document.querySelector(`#reps-${b.dataset.i}`).value=b.dataset.r};
    if(a==='effort')b.onclick=()=>{const it=itemById(activeItemId);it.effort=b.dataset.v;save();render()};
    if(a==='save-cardio')b.onclick=()=>saveCardio(itemById(activeItemId));
    if(a==='timer-stop')b.onclick=stopTimer;
    if(a==='timer-plus')b.onclick=()=>{if(state.timer){state.timer.endsAt+=30000;save();render()}};
    if(a==='finish')b.onclick=()=>endWorkout(false);
    if(a==='modal-close')b.onclick=()=>{modal=null;render()};
    if(a==='modal-continue')b.onclick=()=>{const t=itemById(modal.targetId);modal=null;currentItems().forEach(x=>{if(x.status==='active')x.status='todo'});t.status='active';if(t.actualOrder==null)t.actualOrder=nextActualOrder();activeItemId=t.id;save();render()};
    if(a==='finish-force')b.onclick=()=>endWorkout(true);
    if(a==='save-measure')b.onclick=()=>{const w=Number(document.querySelector('#m-weight').value),wa=Number(document.querySelector('#m-waist').value);if(!w){modal={type:'info',title:'Peso mancante',text:'Inserisci il peso.'};render();return}state.measurements.push({date:today(),weight:w,waist:wa||null});save();render()};
  });
  const crowd=document.querySelector('#crowded');if(crowd)crowd.onchange=e=>{state.currentWorkout.crowded=e.target.checked;state.settings.crowded=e.target.checked;save()};
  const machine=document.querySelector('#cardio-machine');if(machine)machine.onchange=()=>{const item=itemById(activeItemId);item.cardioData.machine=machine.value;save();render()};
  ['cardio-min','cardio-dist','cardio-incline','cardio-resistance','cardio-hr','cardio-effort'].forEach(id=>{const el=document.querySelector('#'+id);if(el)el.oninput=()=>{const item=itemById(activeItemId);if(!item)return;item.cardioData={...item.cardioData,machine:document.querySelector('#cardio-machine')?.value||item.cardioData.machine,minutes:Number(document.querySelector('#cardio-min')?.value)||null,distance:Number(document.querySelector('#cardio-dist')?.value)||null,incline:Number(document.querySelector('#cardio-incline')?.value)||null,resistance:Number(document.querySelector('#cardio-resistance')?.value)||null,heartRate:Number(document.querySelector('#cardio-hr')?.value)||null,effort:document.querySelector('#cardio-effort')?.value||'Giusto'};save()}});
}

window.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
window.addEventListener('beforeunload',save);
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
render();
