const APP_VERSION = '0.2.0-beta';
const STORAGE_KEY = 'gymTrackerLuca.v1';

const routines = {
  A: [
    cardio('warmup-a','Riscaldamento cardio','warmup',8,10),
    strength('a-legpress','Leg Press','Gambe',3,8,12,90,70,2.5,'high'),
    strength('a-legcurl','Leg Curl','Gambe',3,10,15,75,35,2.5,'medium'),
    strength('a-chest','Chest Press','Petto',3,8,12,90,40,2.5,'high'),
    strength('a-lat','Lat Machine','Schiena',3,8,12,90,40,2.5,'high'),
    strength('a-shoulder','Shoulder Press','Spalle',2,10,12,75,25,2.5,'medium'),
    strength('a-triceps','Tricipiti ai cavi','Tricipiti',2,10,15,60,20,2.5,'low'),
    strength('a-abs','Abdominal Crunch machine','Addome',2,12,15,60,25,2.5,'low'),
    cardio('final-a','Cardio finale','final',12,15)
  ],
  B: [
    cardio('warmup-b','Riscaldamento cardio','warmup',8,10),
    strength('b-legpress','Leg Press','Gambe',3,10,12,90,70,2.5,'high'),
    strength('b-legcurl','Leg Curl','Gambe',3,10,15,75,35,2.5,'medium'),
    strength('b-row','Low Row','Schiena',3,8,12,90,35,2.5,'high'),
    strength('b-incline','Chest Press inclinata','Petto',3,8,12,90,35,2.5,'high'),
    strength('b-lateral','Alzate laterali','Spalle',2,12,15,60,7.5,1,'medium'),
    strength('b-curl','Curl bicipiti macchina/cavi','Bicipiti',2,10,15,60,15,2.5,'low'),
    strength('b-abs','Abdominal Crunch machine','Addome',2,12,15,60,25,2.5,'low'),
    cardio('final-b','Cardio finale','final',12,15)
  ],
  C: [
    cardio('warmup-c','Riscaldamento cardio','warmup',8,10),
    strength('c-legpress','Pressa 45° / Leg Press','Gambe',3,8,12,90,70,2.5,'high'),
    strength('c-legext','Leg Extension','Gambe',2,12,15,75,30,2.5,'medium'),
    strength('c-chest','Chest Press','Petto',3,8,12,90,40,2.5,'high'),
    strength('c-lat','Lat Machine','Schiena',3,8,12,90,40,2.5,'high'),
    strength('c-row','Low Row','Schiena',2,10,12,75,35,2.5,'high'),
    strength('c-shoulder','Shoulder Press','Spalle',2,10,12,75,25,2.5,'medium'),
    strength('c-curl','Curl bicipiti macchina/cavi','Bicipiti',2,10,15,60,15,2.5,'low'),
    strength('c-triceps','Tricipiti ai cavi','Tricipiti',2,10,15,60,20,2.5,'low'),
    cardio('final-c','Cardio finale','final',10,15)
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
let historyWorkoutId = null;
let editingItemId = null;

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
    cardioData:x.type==='cardio'?{machine:letter==='B'&&x.kind==='warmup'?'Crosstrainer':'Tapis roulant',minutes:null,distance:null,incline:null,resistance:null,heartRate:null,effort:'Giusto'}:undefined
  }));
}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmtSec(s){s=Math.max(0,Math.floor(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function elapsedText(ms){const s=Math.floor(ms/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function currentRoutineLetter(){return state.currentWorkout?.routine || state.settings.lastRoutine || 'A'}
function selectedWorkout(){return route==='history' && historyWorkoutId ? state.history.find(h=>h.id===historyWorkoutId) : state.currentWorkout}
function isHistory(){return route==='history' && !!historyWorkoutId}
function currentItems(){return selectedWorkout()?.items || []}
function itemById(id){return currentItems().find(x=>String(x.id)===String(id))}
function setStatusClass(s){return ['todo','active','done','occupied','skipped'].includes(s)?s:'todo'}
function completedCount(){return currentItems().filter(x=>x.status==='done').length}
function nextActualOrder(){return 1+currentItems().filter(x=>x.actualOrder!=null).length}

function startWorkout(letter){
  if(state.currentWorkout){modal={type:'info',title:'Allenamento già in corso',text:'Riprendi e termina la seduta in corso prima di iniziarne un’altra.'};render();return}
  historyWorkoutId=null;editingItemId=null;
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
  if(state.currentWorkout){modal={type:'info',title:'Allenamento già in corso',text:'Riprendi e termina la seduta in corso prima di iniziarne un’altra.'};render();return}
  historyWorkoutId=null;editingItemId=null;
  state.currentWorkout={id:crypto.randomUUID?.()||String(Date.now()),routine:'CARDIO',date:today(),startedAt:Date.now(),endedAt:null,crowded:false,items:[{id:'cardio-only',type:'cardio',name:'Solo cardio',kind:'standalone',group:'Cardio',status:'active',actualOrder:1,cardioData:{machine:'Camminata outdoor',minutes:null,distance:null,incline:null,resistance:null,heartRate:null,effort:'Giusto'}}]};
  activeItemId='cardio-only';save();route='workout';render();
}

function activateItem(item){
  if(!item)return;
  editingItemId=null;
  if(isHistory() || item.status==='done' || item.status==='skipped'){activeItemId=item.id;render();return}
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
    if(h.id===selectedWorkout()?.id || h.startedAt>=selectedWorkout()?.startedAt)continue;
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
  if(weightEl?.value.trim()===''||!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<=0||reps>1000){modal={type:'info',title:'Controlla i dati',text:'Inserisci un peso valido e un numero intero di ripetizioni tra 1 e 1000.'};render();return}
  const correction=!!item.setsDone[index] || isHistory();
  item.setsDone[index]={weight,reps,doneAt:Date.now()};
  if(item.drafts)delete item.drafts[index];
  delete item.prefillWeight;
  if(!correction)startRest(item.rest,item.name);
  recalculateItem(item);
  save();render();
}
function recalculateItem(item){
  const allDone=item.setsDone.length===item.sets && item.setsDone.every(s=>s && Number.isFinite(s.weight) && s.weight>=0 && Number.isInteger(s.reps) && s.reps>0);
  item.status=allDone?'done':(isHistory()?'todo':'active');
  if(allDone)item.effort=item.effort||'Giusto';
}
function clearSet(item,index){
  item.setsDone[index]=null;
  if(item.drafts)delete item.drafts[index];
  recalculateItem(item);save();render();
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
  if(completed.length!==item.sets)return {label:'Dati insufficienti',tone:'muted',detail:'Completa tutte le serie per avere un suggerimento.'};
  const allHigh=completed.every(s=>s.reps>=item.maxReps);
  const anyBelow=completed.some(s=>s.reps<item.minReps);
  const effort=item.effort||'Giusto';
  if(allHigh&&(effort==='Facile'||effort==='Giusto')) return {label:'Possibile aumento',tone:'ok',detail:`Valuta +${item.step||2.5} kg nella prossima seduta se il risultato si conferma.`};
  if(anyBelow) return {label:'Mantieni / valuta riduzione',tone:'warn',detail:'Non aumentare. Se succede di nuovo, valuta un piccolo calo del carico.'};
  return {label:'Mantieni',tone:'muted',detail:'Resta sul carico attuale e consolida le ripetizioni.'};
}

function cardioFields(item){
  const d=item.cardioDraft||item.cardioData||{};
  const outdoor=d.machine==='Camminata outdoor';
  const dist=Number(d.distance);
  const mins=Number(d.minutes);
  let pace='—',speed='—';
  if(dist>0&&mins>0){const totalSec=Math.round(mins*60/dist);pace=`${Math.floor(totalSec/60)}:${String(totalSec%60).padStart(2,'0')} min/km`;speed=`${(dist/(mins/60)).toFixed(1)} km/h`}
  return `<div class="stack">
    <label>Tipo<select id="cardio-machine"><option${d.machine==='Tapis roulant'?' selected':''}>Tapis roulant</option><option${d.machine==='Cyclette'?' selected':''}>Cyclette</option><option${d.machine==='Crosstrainer'?' selected':''}>Crosstrainer</option><option${d.machine==='Scala'?' selected':''}>Scala</option><option${d.machine==='Camminata outdoor'?' selected':''}>Camminata outdoor</option><option${d.machine==='Altro'?' selected':''}>Altro</option></select></label>
    <div class="grid2"><label>Durata (min)<input id="cardio-min" type="number" min="1" value="${d.minutes??''}" placeholder="15"></label><label>Distanza (km)<input id="cardio-dist" type="number" min="0" step="0.01" value="${d.distance??''}" placeholder="facoltativa"></label></div>
    ${!outdoor?`<div class="grid2"><label>Inclinazione %<input id="cardio-incline" type="number" step="0.5" value="${d.incline??''}" placeholder="facoltativa"></label><label>Resistenza / livello<input id="cardio-resistance" type="number" step="1" value="${d.resistance??''}" placeholder="facoltativo"></label></div>`:''}
    <label>Frequenza cardiaca media<input id="cardio-hr" type="number" min="30" max="220" value="${d.heartRate??''}" placeholder="facoltativa"></label>
    <label>Sensazione<select id="cardio-effort"><option${d.effort==='Facile'?' selected':''}>Facile</option><option${d.effort==='Giusto'?' selected':''}>Giusto</option><option${d.effort==='Difficile'?' selected':''}>Difficile</option></select></label>
    ${outdoor?`<div class="notice" id="outdoor-metrics"><strong>Calcolo automatico</strong><br>Passo medio: ${pace}<br>Velocità media: ${speed}</div>`:''}
  </div>`;
}
function saveCardio(item){
  const g=id=>document.querySelector(id);
  const data=readCardioForm();
  if(!Number.isFinite(data.minutes)||data.minutes<=0||['distance','incline','resistance','heartRate'].some(k=>data[k]!==null&&(!Number.isFinite(data[k])||data[k]<0))){modal={type:'info',title:'Dati cardio non validi',text:'Inserisci una durata positiva e parametri validi, senza valori negativi.'};render();return}
  item.cardioData=data;delete item.cardioDraft;
  item.status='done';activeItemId=null;save();
  if(!isHistory() && state.currentWorkout.routine==='CARDIO') endWorkout(true); else render();
}
function readCardioForm(){
  const value=id=>{const v=document.querySelector('#'+id)?.value;return v==null||v.trim()===''?null:Number(v)};
  return {machine:document.querySelector('#cardio-machine').value,minutes:value('cardio-min'),distance:value('cardio-dist'),incline:value('cardio-incline'),resistance:value('cardio-resistance'),heartRate:value('cardio-hr'),effort:document.querySelector('#cardio-effort').value};
}
function updateCardioDraft(){
  const item=itemById(activeItemId);if(!item)return;
  item.cardioDraft=readCardioForm();save();
  const box=document.querySelector('#outdoor-metrics'),d=item.cardioDraft;
  if(box){const sec=Math.round(d.minutes*60/d.distance);box.textContent=d.minutes>0&&d.distance>0?`Passo medio: ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} min/km · Velocità media: ${(d.distance/(d.minutes/60)).toFixed(1)} km/h`:'Inserisci durata e distanza per calcolare passo e velocità.'}
}

function render(){
  const app=document.querySelector('#app');
  app.innerHTML=`<header class="topbar"><div class="row between"><div><div class="brand">GYM TRACKER LUCA</div><div class="title">${pageTitle()}</div></div><span class="pill">Beta 0.2</span></div></header><main class="container">${timerHtml()}${pageHtml()}</main>${bottomNav()}${modalHtml()}`;
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
    <section class="card"><div class="small muted">Allenamento programmato</div><div class="big">Scheda ${state.settings.lastRoutine||'A'}</div><div class="small muted">Dimagrimento e mantenimento massa · Full body</div><div class="small muted">8–10 min riscaldamento + pesi + 10–15 min cardio finale</div><div class="grid3" style="margin-top:14px"><button class="btn primary" data-act="start" data-r="A">A</button><button class="btn primary" data-act="start" data-r="B">B</button><button class="btn primary" data-act="start" data-r="C">C</button></div></section>
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
  const w=selectedWorkout();
  return `<div class="stack">${w.routine!=='CARDIO'?`<div class="notice"><strong>${esc({A:'A — Gambe + Petto',B:'B — Schiena + Catena posteriore',C:'C — Full body equilibrata'}[w.routine]||w.routine)}</strong><br>Riscaldamento → pesi → cardio finale</div>`:''}<div class="row between wrap"><div><div class="strong">${completedCount()} / ${currentItems().length} completati</div><div class="small muted">Tocca un esercizio per aprirlo.</div></div>${!isHistory()&&w.routine!=='CARDIO'?`<label class="row" style="display:flex;color:white"><input id="crowded" type="checkbox" style="width:22px" ${w.crowded?'checked':''}> Palestra affollata</label>`:''}</div>
  ${currentItems().map(x=>`<button class="exercise" data-act="open-item" data-id="${esc(x.id)}"><div class="row between"><div class="row"><span class="status ${setStatusClass(x.status)}"></span><div><div class="strong">${esc(x.name)}</div><div class="meta">${x.type==='cardio'?`${x.minMinutes??''}${x.maxMinutes?`–${x.maxMinutes}`:''} min`: `${esc(x.group)} · ${x.sets} × ${x.minReps}–${x.maxReps}`}</div></div></div><div class="small muted">${x.status==='occupied'?'da recuperare':x.status==='done'?'fatto':'apri'}</div></div></button>`).join('')}
  ${!isHistory()?'<button class="btn full" data-act="finish">TERMINA ALLENAMENTO</button>':''}</div>`
}
function itemDetailHtml(item){
  const back=`<button class="btn ghost full" data-act="back-list">← Torna alla lista</button>`;
  if(item.type==='cardio')return `<div class="stack">${back}<section class="card"><div class="small muted">Cardio · ${item.status==='done'?'Completato ✓':'Da completare'}</div><div class="big">${esc(item.name)}</div>${item.kind!=='standalone'?`<div class="small muted">Obiettivo ${item.minMinutes}–${item.maxMinutes} min</div>`:''}<div style="margin-top:14px">${cardioFields(item)}</div><button class="btn primary full" style="margin-top:14px" data-act="save-cardio">${item.status==='done'?'SALVA CORREZIONI':'✓ COMPLETA CARDIO'}</button></section>${back}</div>`;
  const prev=previousPerformance(item),rec=recommendation(item),editing=editingItemId===item.id;
  return `<div class="stack">${back}<section class="card"><div class="small muted">${esc(item.group)} · ${item.status==='done'?'Completato ✓':item.status==='skipped'?'Saltato':'Da completare'}</div><div class="big">${esc(item.name)}</div><div class="grid2" style="margin-top:12px"><div class="subcard"><div class="small muted">Ultima volta</div><div class="strong">${prev?formatPrev(prev):'Nessun dato precedente'}</div></div><div class="subcard"><div class="small muted">Obiettivo</div><div class="strong">${item.sets} × ${item.minReps}–${item.maxReps}</div><div class="small muted">rec. ${item.rest}s</div></div></div>
  ${item.setsDone.some(Boolean)||isHistory()?`<button class="btn full" style="margin-top:12px" data-act="edit-item">${editing?'TERMINA MODIFICA':'MODIFICA DATI'}</button><p class="small muted">${editing?'Salva ogni serie corretta con “Salva correzione”. La sensazione si salva al tocco.':'Puoi correggere peso, ripetizioni e sensazione anche dopo il completamento.'}</p>`:''}
  <div class="stack" style="margin-top:14px">${item.setsDone.map((row,i)=>setHtml(item,row,i)).join('')}</div>
  <div class="section-title" style="margin-top:14px">Sensazione esercizio</div><div class="grid3">${['Facile','Giusto','Difficile'].map(e=>`<button class="btn ${item.effort===e?(e==='Facile'?'ok':e==='Difficile'?'warn':'primary'):''}" data-act="effort" data-v="${e}">${e}</button>`).join('')}</div>
  ${rec?`<div class="notice ${rec.tone==='ok'?'ok':rec.tone==='warn'?'warn':''}" style="margin-top:12px"><strong>${esc(rec.label)}</strong><br>${esc(rec.detail)}</div>`:''}
  </section>${back}${!isHistory()&&item.status!=='done'?`<div class="grid2"><button class="btn warn" data-act="occupied">OCCUPATA</button><button class="btn" data-act="skip">SALTA</button></div>`:''}</div>`;
}
function setHtml(item,row,i){
  const editing=editingItemId===item.id;
  const draft=(!row||editing)?item.drafts?.[i]:null;
  const locked=!!row&&!editing || isHistory()&&!editing;
  const weight=draft?.weight ?? row?.weight ?? inheritedWeight(item,i);
  const reps=draft?.reps ?? row?.reps ?? '';
  return `<div class="setrow ${row?'setdone':''}"><div class="row between"><div class="strong">Serie ${i+1}</div><div>${row?'✅':''}</div></div><div class="grid2" style="margin-top:10px"><label>Peso kg<input id="weight-${i}" data-set-index="${i}" data-field="weight" type="number" inputmode="decimal" min="0" step="any" value="${esc(weight)}" ${locked?'disabled':''}></label><label>Ripetizioni<input id="reps-${i}" data-set-index="${i}" data-field="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${esc(reps)}" placeholder="${item.minReps}" ${locked?'disabled':''}></label></div>
  ${!locked?`<div class="quick" style="margin-top:8px"><button data-act="weight-delta" data-i="${i}" data-d="-${item.step||1}">−${item.step||1}</button><button data-act="weight-delta" data-i="${i}" data-d="${item.step||1}">+${item.step||1}</button><button data-act="rep-set" data-i="${i}" data-r="${item.minReps}">${item.minReps}</button><button data-act="rep-set" data-i="${i}" data-r="${item.maxReps}">${item.maxReps}</button></div><button class="btn primary full" style="margin-top:9px" data-act="complete-set" data-i="${i}">${row?'SALVA CORREZIONE':'✓ COMPLETA SERIE'}</button>${row&&editing?`<button class="btn full" style="margin-top:8px" data-act="clear-set" data-i="${i}">Annulla completamento serie</button>`:''}`:'<div class="small muted" style="margin-top:9px">Serie completata · usa Modifica dati per correggerla</div>'}</div>`;
}
function formatPrev(prev){const vals=prev.setsDone.filter(Boolean);if(!vals.length)return '—';return `${vals[vals.length-1].weight} kg · ${vals.map(s=>s.reps).join(' / ')}`}
function historyHtml(){
  if(historyWorkoutId){
    if(!selectedWorkout()){historyWorkoutId=null;return historyHtml()}
    return `<div class="stack"><button class="btn ghost" data-act="back-history">← Tutto lo storico</button><div class="notice">${esc(selectedWorkout().date)} · ${selectedWorkout().routine==='CARDIO'?'Solo cardio':'Scheda '+esc(selectedWorkout().routine)} · dati modificabili</div>${activeItemId?itemDetailHtml(itemById(activeItemId)):workoutListHtml()}</div>`;
  }
  return `<div class="stack"><button class="btn" data-act="export-data">Esporta backup dati</button>${state.history.length?state.history.map(h=>`<section class="card"><div class="row between"><div><div class="strong">${h.routine==='CARDIO'?'Solo cardio':'Scheda '+esc(h.routine)}</div><div class="small muted">${new Date(h.startedAt).toLocaleString('it-IT')}</div></div><span class="pill">${Math.max(1,Math.round((h.endedAt-h.startedAt)/60000))} min</span></div><div class="small muted" style="margin-top:9px">${h.items.filter(x=>x.status==='done').length}/${h.items.length} attività completate</div><button class="btn full" style="margin-top:10px" data-act="view-history" data-id="${esc(h.id)}">Apri allenamento</button></section>`).join(''):'<div class="notice">Nessun allenamento registrato.</div>'}</div>`;
}
function latestWeight(){const vals=state.measurements.filter(x=>Number(x.weight)>0).sort((a,b)=>b.date.localeCompare(a.date));return vals[0]?.weight??104}
function progressHtml(){
  const m=state.measurements.slice().sort((a,b)=>a.date.localeCompare(b.date));const weights=m.map(x=>Number(x.weight)).filter(Number.isFinite);const min=Math.min(...weights,0),max=Math.max(...weights,1);return `<div class="stack"><section class="card"><div class="section-title">Registra misure</div><div class="grid2"><label>Peso kg<input id="m-weight" type="number" step="0.1" value="${latestWeight()}"></label><label>Vita cm<input id="m-waist" type="number" step="0.5" placeholder="facoltativa"></label></div><button class="btn primary full" style="margin-top:12px" data-act="save-measure">SALVA</button></section><section class="card"><div class="section-title">Peso</div><div class="big">${latestWeight()} kg</div><div class="chart">${m.slice(-8).map((x,i)=>{const v=Number(x.weight);const pct=max===min?60:20+60*(v-min)/(max-min);return `<div class="bar" style="height:${pct}%"><span>${i+1}</span></div>`}).join('')}</div></section><section class="card"><div class="section-title">Misure registrate</div>${m.slice().reverse().slice(0,8).map(x=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid #273449"><span>${x.date}</span><span>${x.weight} kg${x.waist?` · ${x.waist} cm`:''}</span></div>`).join('')}</section></div>`
}
function bottomNav(){return `<nav class="bottomnav"><button class="navbtn ${route==='home'?'active':''}" data-nav="home">Home</button><button class="navbtn ${route==='workout'?'active':''}" data-nav="workout">Allenamento</button><button class="navbtn ${route==='history'?'active':''}" data-nav="history">Storico</button><button class="navbtn ${route==='progress'?'active':''}" data-nav="progress">Progressi</button></nav>`}
function modalHtml(){if(!modal)return '';if(modal.type==='groupwarn')return `<div class="modal-wrap"><div class="modal"><div class="big" style="font-size:21px">Cambio gruppo muscolare</div><p class="muted">Hai lasciato <strong>${esc(modal.source)}</strong> in sospeso. È ancora disponibile un esercizio per <strong>${esc(modal.group)}</strong>: ${esc(modal.alternative)}.</p><div class="grid2"><button class="btn" data-act="modal-close">Torna</button><button class="btn primary" data-act="modal-continue">Continua</button></div></div></div>`;if(modal.type==='finish')return `<div class="modal-wrap"><div class="modal"><div class="big" style="font-size:21px">Allenamento non completo</div><p class="muted">Restano ${modal.pending.length} attività.</p><div class="grid2"><button class="btn" data-act="modal-close">Torna</button><button class="btn primary" data-act="finish-force">Termina comunque</button></div></div></div>`;return `<div class="modal-wrap"><div class="modal"><div class="big" style="font-size:21px">${esc(modal.title)}</div><p class="muted">${esc(modal.text)}</p><button class="btn primary full" data-act="modal-close">OK</button></div></div>`}

function wire(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{const n=b.dataset.nav;historyWorkoutId=null;editingItemId=null;if(n==='workout'&&!state.currentWorkout){route='home'}else route=n;activeItemId=null;render()});
  document.querySelectorAll('[data-act]').forEach(b=>{
    const a=b.dataset.act;
    if(a==='start')b.onclick=()=>startWorkout(b.dataset.r);
    if(a==='resume')b.onclick=()=>{route='workout';render()};
    if(a==='cardio-only')b.onclick=startStandaloneCardio;
    if(a==='open-item')b.onclick=()=>activateItem(itemById(b.dataset.id));
    if(a==='back-list')b.onclick=()=>{activeItemId=null;editingItemId=null;save();render();window.scrollTo(0,0)};
    if(a==='view-history')b.onclick=()=>{historyWorkoutId=b.dataset.id;activeItemId=null;editingItemId=null;render();window.scrollTo(0,0)};
    if(a==='back-history')b.onclick=()=>{historyWorkoutId=null;activeItemId=null;editingItemId=null;render()};
    if(a==='edit-item')b.onclick=()=>{editingItemId=editingItemId===activeItemId?null:activeItemId;render()};
    if(a==='clear-set')b.onclick=()=>clearSet(itemById(activeItemId),Number(b.dataset.i));
    if(a==='export-data')b.onclick=exportData;
    if(a==='occupied')b.onclick=()=>markOccupied(itemById(activeItemId));
    if(a==='skip')b.onclick=()=>markSkipped(itemById(activeItemId));
    if(a==='complete-set')b.onclick=()=>completeSet(itemById(activeItemId),Number(b.dataset.i));
    if(a==='weight-delta')b.onclick=()=>{const el=document.querySelector(`#weight-${b.dataset.i}`);el.value=Math.max(0,(Number(el.value)||0)+Number(b.dataset.d));el.dispatchEvent(new Event('input'));};
    if(a==='rep-set')b.onclick=()=>{const el=document.querySelector(`#reps-${b.dataset.i}`);el.value=b.dataset.r;el.dispatchEvent(new Event('input'))};
    if(a==='effort')b.onclick=()=>{const it=itemById(activeItemId);it.effort=b.dataset.v;save();render()};
    if(a==='save-cardio')b.onclick=()=>saveCardio(itemById(activeItemId));
    if(a==='timer-stop')b.onclick=stopTimer;
    if(a==='timer-plus')b.onclick=()=>{if(state.timer){state.timer.endsAt+=30000;save();render()}};
    if(a==='finish')b.onclick=()=>endWorkout(false);
    if(a==='modal-close')b.onclick=()=>{modal=null;render()};
    if(a==='modal-continue')b.onclick=()=>{const t=itemById(modal.targetId);modal=null;currentItems().forEach(x=>{if(x.status==='active')x.status='todo'});t.status='active';if(t.actualOrder==null)t.actualOrder=nextActualOrder();activeItemId=t.id;save();render()};
    if(a==='finish-force')b.onclick=()=>endWorkout(true);
    if(a==='save-measure')b.onclick=()=>{const w=Number(document.querySelector('#m-weight').value),wa=Number(document.querySelector('#m-waist').value);if(!Number.isFinite(w)||w<=0||!Number.isFinite(wa)||wa<0){modal={type:'info',title:'Peso mancante',text:'Inserisci il peso.'};render();return}state.measurements.push({date:today(),weight:w,waist:wa||null});save();render()};
  });
  document.querySelectorAll('[data-set-index]').forEach(el=>el.oninput=()=>{const it=itemById(activeItemId);it.drafts=it.drafts||{};const i=el.dataset.setIndex;it.drafts[i]={weight:document.querySelector('#weight-'+i).value,reps:document.querySelector('#reps-'+i).value};save()});
  const crowd=document.querySelector('#crowded');if(crowd)crowd.onchange=e=>{state.currentWorkout.crowded=e.target.checked;state.settings.crowded=e.target.checked;save()};
  const machine=document.querySelector('#cardio-machine');if(machine)machine.onchange=()=>{updateCardioDraft();render()};
  ['cardio-min','cardio-dist','cardio-incline','cardio-resistance','cardio-hr','cardio-effort'].forEach(id=>{const el=document.querySelector('#'+id);if(el)el.oninput=updateCardioDraft});
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
window.addEventListener('beforeunload',save);
function exportData(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gym-luca-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));}
render();

