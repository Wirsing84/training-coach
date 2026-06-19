const exercises = [
  { name:'Klassische Bizepscurls', load:'2 × 7 kg', sets:3, reps:10, start:170, end:40, lift:2, hold:1, lower:4, rest:30, note:'Handflächen nach vorne. Oberarme bleiben am Körper. Keine Schwungbewegung.' },
  { name:'Hammer Curls', load:'2 × 7 kg', sets:3, reps:10, start:170, end:50, lift:2, hold:1, lower:4, rest:30, note:'Handflächen zeigen zueinander. Handgelenke neutral halten. Nicht mit den Schultern ziehen.' },
  { name:'Konzentrationscurl links', load:'1 × 10 kg', sets:2, reps:8, start:160, end:30, lift:2, hold:2, lower:5, rest:0, note:'Ellenbogen an die Innenseite des Oberschenkels. Sehr kontrolliert arbeiten.' },
  { name:'Konzentrationscurl rechts', load:'1 × 10 kg', sets:2, reps:8, start:160, end:30, lift:2, hold:2, lower:5, rest:20, note:'Gleiche saubere Ausführung wie links. Kein Ruck aus der Schulter.' },
  { name:'21er-Curls unten', load:'2 × 5 kg', sets:2, reps:7, start:170, end:90, lift:2, hold:0, lower:3, rest:0, note:'Nur untere Hälfte. Kontrolliert bleiben, nicht schwingen.' },
  { name:'21er-Curls oben', load:'2 × 5 kg', sets:2, reps:7, start:90, end:40, lift:2, hold:0, lower:3, rest:0, note:'Nur obere Hälfte. Ellenbogen nicht nach vorne schieben.' },
  { name:'21er-Curls komplett', load:'2 × 5 kg', sets:2, reps:7, start:170, end:40, lift:2, hold:0, lower:3, rest:30, note:'Voller Bewegungsumfang. Langsam absenken, sauber beenden.' }
];

const $ = id => document.getElementById(id);
const CIRC = 2 * Math.PI * 52;
let state = {
  screen:'setup', ex:0, set:1, rep:1, phase:'ready', label:'Bereit', className:'',
  remaining:0, duration:1, running:false, elapsed:0, voice:true, interval:null
};

function save(){
  const { interval, ...copy } = state;
  localStorage.setItem('trainingCoachState', JSON.stringify(copy));
}
function load(){
  try{
    const stored = JSON.parse(localStorage.getItem('trainingCoachState') || 'null');
    if(stored && stored.screen !== 'done') state = { ...state, ...stored, running:false, interval:null };
  }catch(e){}
}
function current(){ return exercises[state.ex]; }
function fmt(s){ return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }
function durationFor(phase){
  const e = current();
  if(phase === 'lift') return e.lift;
  if(phase === 'hold') return e.hold;
  if(phase === 'lower') return e.lower;
  if(phase === 'rest') return e.rest || 20;
  return 1;
}
function setPhase(phase,label,className){
  state.phase = phase;
  state.label = label;
  state.className = className;
  state.duration = Math.max(1, durationFor(phase));
  state.remaining = state.duration;
  vibrate(phase === 'rest' ? 80 : 35);
  speak(label);
}
function firstPhase(){ setPhase('lift','Heben','lift'); }
function resetExerciseProgress(index){
  state.ex = index;
  state.set = 1;
  state.rep = 1;
  state.phase = 'ready';
  state.label = 'Bereit';
  state.className = '';
  state.remaining = 0;
  state.duration = 1;
}
function goToExercise(index){
  stopTimer(false);
  resetExerciseProgress(index);
  show('workout');
  speak(exercises[index].name);
  render();
}
function goToNextExercise(){
  stopTimer(false);
  const next = state.ex + 1;
  if(next >= exercises.length){ finish(); return; }
  resetExerciseProgress(next);
  show('workout');
  speak(exercises[next].name);
  render();
}
function vibrate(ms){ if(navigator.vibrate) navigator.vibrate(ms); }
function speak(text){
  if(!state.voice || !('speechSynthesis' in window)) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
function show(screen){
  ['setup','workout','done'].forEach(id => $(id).classList.toggle('active', id === screen));
  state.screen = screen;
  save();
}
function renderPlan(){
  $('planPreview').innerHTML = '';
  exercises.forEach((e,i)=>{
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'planItem';
    item.setAttribute('aria-label', `${e.name} starten`);
    item.innerHTML = `<div class="planNo">${i+1}</div><div class="planText"><strong>${e.name}</strong><span>${e.sets}×${e.reps} · ${e.load} · ${e.start}° → ${e.end}° · ${e.lift}/${e.hold}/${e.lower}s</span></div>`;
    ['click','touchend'].forEach(ev => item.addEventListener(ev, event => { event.preventDefault(); goToExercise(i); }, { passive:false }));
    $('planPreview').appendChild(item);
  });
}
function render(){
  const e = current();
  $('overallLabel').textContent = `Übung ${state.ex + 1} von ${exercises.length}`;
  $('exerciseName').textContent = e.name;
  $('elapsed').textContent = fmt(state.elapsed);
  $('phase').textContent = state.phase === 'ready' ? 'Bereit' : state.label;
  $('phase').className = 'phase ' + state.className;
  $('seconds').textContent = state.phase === 'ready' ? durationFor('lift') : state.remaining;
  $('setCount').textContent = `${state.set} / ${e.sets}`;
  $('repCount').textContent = `${state.rep} / ${e.reps}`;
  $('load').textContent = e.load;
  $('angle').textContent = `${e.start}° → ${e.end}°`;
  $('tempo').textContent = `${e.lift}s hoch · ${e.hold}s halten · ${e.lower}s runter`;
  $('coachNote').textContent = e.note;
  $('playPause').textContent = state.running ? 'Pause' : 'Start';
  $('skipPhase').textContent = state.ex === exercises.length - 1 ? 'Training beenden' : 'Übung weiter';
  $('toggleVoice').textContent = `Sprachansagen: ${state.voice ? 'an' : 'aus'}`;
  const progress = state.duration ? Math.max(0, Math.min(1, 1 - state.remaining / state.duration)) : 0;
  $('ringProgress').style.strokeDasharray = CIRC;
  $('ringProgress').style.strokeDashoffset = CIRC * (1 - progress);
  $('ringProgress').style.stroke = state.className === 'lift' ? '#22c55e' : state.className === 'hold' ? '#f59e0b' : state.className === 'rest' ? '#ef4444' : '#38bdf8';
  save();
}
function advance(){
  const e = current();
  if(state.phase === 'lift'){
    e.hold > 0 ? setPhase('hold','Halten','hold') : setPhase('lower','Absenken','lower');
    return;
  }
  if(state.phase === 'hold'){
    setPhase('lower','Absenken','lower');
    return;
  }
  if(state.phase === 'lower'){
    state.rep++;
    if(state.rep <= e.reps){ firstPhase(); return; }
    state.rep = 1;
    state.set++;
    if(state.set <= e.sets){ setPhase('rest','Pause','rest'); return; }
    state.set = 1;
    state.ex++;
    if(state.ex >= exercises.length){ finish(); return; }
    if(e.rest > 0) setPhase('rest','Pause','rest'); else firstPhase();
    return;
  }
  if(state.phase === 'rest') firstPhase();
}
function tick(){
  state.elapsed++;
  state.remaining--;
  if(state.remaining <= 0) advance();
  render();
}
function startTimer(){
  if(state.interval) return;
  if(state.phase === 'ready'){
    speak(`${current().name}. Satz ${state.set}. Wiederholung ${state.rep}.`);
    firstPhase();
  }
  state.running = true;
  state.interval = setInterval(tick, 1000);
  render();
}
function stopTimer(renderAfter=true){
  state.running = false;
  if(state.interval){ clearInterval(state.interval); state.interval = null; }
  if(renderAfter) render();
}
function toggleTimer(){ state.running ? stopTimer() : startTimer(); }
function reset(all=true){
  stopTimer(false);
  state = { ...state, screen:'setup', ex:0, set:1, rep:1, phase:'ready', label:'Bereit', className:'', remaining:0, duration:1, running:false, elapsed:0, interval:null };
  if(all) localStorage.removeItem('trainingCoachState');
  show('setup');
  render();
}
function finish(){
  stopTimer(false);
  state.screen = 'done';
  speak('Training abgeschlossen');
  vibrate([80,60,120]);
  localStorage.removeItem('trainingCoachState');
  show('done');
}
function bind(id, fn){
  const el = $(id);
  ['click','touchend'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); fn(); }, { passive:false }));
}

load();
renderPlan();
bind('startWorkout', ()=>{ goToExercise(0); });
bind('toggleVoice', ()=>{ state.voice = !state.voice; render(); });
bind('backToSetup', ()=>{ stopTimer(false); show('setup'); render(); });
bind('playPause', toggleTimer);
bind('skipPhase', goToNextExercise);
bind('resetWorkout', ()=>reset(true));
bind('restart', ()=>reset(true));
show(state.screen || 'setup');
render();
