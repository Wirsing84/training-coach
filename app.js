const exercises = [
  { name:'Classic Biceps Curls', image:'images/classic-biceps-curl.svg', load:'2 × 7 kg', sets:3, reps:10, start:170, end:40, lift:2, hold:1, lower:4, rest:30, note:'Palms facing forward. Upper arms stay close to your body. No swinging.' },
  { name:'Hammer Curls', image:'images/hammer-curl.svg', load:'2 × 7 kg', sets:3, reps:10, start:170, end:50, lift:2, hold:1, lower:4, rest:30, note:'Palms face each other. Keep wrists neutral. Do not pull with your shoulders.' },
  { name:'Concentration Curl Left', image:'images/concentration-curl-left.svg', load:'1 × 10 kg', sets:2, reps:8, start:160, end:30, lift:2, hold:2, lower:5, rest:0, note:'Elbow against the inside of your thigh. Move slowly and with control.' },
  { name:'Concentration Curl Right', image:'images/concentration-curl-right.svg', load:'1 × 10 kg', sets:2, reps:8, start:160, end:30, lift:2, hold:2, lower:5, rest:20, note:'Same clean form as the left side. No jerking from the shoulder.' },
  { name:'21s Curls Lower Half', image:'images/twenty-ones-lower-half.svg', load:'2 × 5 kg', sets:2, reps:7, start:170, end:90, lift:2, hold:0, lower:3, rest:0, note:'Lower half only. Stay controlled. Do not swing.' },
  { name:'21s Curls Upper Half', image:'images/twenty-ones-upper-half.svg', load:'2 × 5 kg', sets:2, reps:7, start:90, end:40, lift:2, hold:0, lower:3, rest:0, note:'Upper half only. Do not let your elbows drift forward.' },
  { name:'21s Curls Full Range', image:'images/twenty-ones-full-range.svg', load:'2 × 5 kg', sets:2, reps:7, start:170, end:40, lift:2, hold:0, lower:3, rest:30, note:'Full range of motion. Lower slowly and finish clean.' }
];

const $ = id => document.getElementById(id);
const CIRC = 2 * Math.PI * 52;
let preferredVoice = null;
let state = {
  screen:'setup', ex:0, set:1, rep:1, phase:'ready', label:'Ready', className:'',
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
function coachPhrase(phase){
  if(phase === 'lift') return 'Lift smoothly. Stay strong.';
  if(phase === 'hold') return 'Hold it. Keep the tension.';
  if(phase === 'lower') return 'Lower slowly. Stay in control.';
  if(phase === 'rest') return 'Rest. Breathe and relax your arms.';
  return phase;
}
function setPhase(phase,label,className){
  state.phase = phase;
  state.label = label;
  state.className = className;
  state.duration = Math.max(1, durationFor(phase));
  state.remaining = state.duration;
  vibrate(phase === 'rest' ? 80 : 35);
  speak(coachPhrase(phase));
}
function firstPhase(){ setPhase('lift','Lift','lift'); }
function resetExerciseProgress(index){
  state.ex = index;
  state.set = 1;
  state.rep = 1;
  state.phase = 'ready';
  state.label = 'Ready';
  state.className = '';
  state.remaining = 0;
  state.duration = 1;
}
function goToExercise(index){
  stopTimer(false);
  resetExerciseProgress(index);
  show('workout');
  speak(`Next exercise: ${exercises[index].name}. Get ready.`);
  render();
}
function goToNextExercise(){
  stopTimer(false);
  const next = state.ex + 1;
  if(next >= exercises.length){ finish(); return; }
  resetExerciseProgress(next);
  show('workout');
  speak(`Nice work. Next up: ${exercises[next].name}.`);
  render();
}
function vibrate(ms){ if(navigator.vibrate) navigator.vibrate(ms); }
function loadVoices(){
  if(!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if(!voices || !voices.length) return;
  const enVoices = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
  preferredVoice =
    enVoices.find(v => /google|natural|premium|enhanced|samantha|alex|daniel|serena/i.test(v.name)) ||
    enVoices[0] ||
    voices[0];
}
function speak(text){
  if(!state.voice || !('speechSynthesis' in window)) return;
  try{
    if(!preferredVoice) loadVoices();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = preferredVoice?.lang || 'en-US';
    if(preferredVoice) u.voice = preferredVoice;
    u.pitch = 1.06;
    u.rate = 0.92;
    u.volume = 1;
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
    item.setAttribute('aria-label', `Start ${e.name}`);
    item.innerHTML = `<div class="planNo">${i+1}</div><div class="planText"><strong>${e.name}</strong><span>${e.sets}×${e.reps} · ${e.load} · ${e.start}° → ${e.end}° · ${e.lift}/${e.hold}/${e.lower}s</span></div>`;
    ['click','touchend'].forEach(ev => item.addEventListener(ev, event => { event.preventDefault(); goToExercise(i); }, { passive:false }));
    $('planPreview').appendChild(item);
  });
}
function render(){
  const e = current();
  $('overallLabel').textContent = `Exercise ${state.ex + 1} of ${exercises.length}`;
  $('exerciseName').textContent = e.name;
  $('exerciseImage').src = e.image;
  $('exerciseImage').alt = `${e.name} movement illustration`;
  $('elapsed').textContent = fmt(state.elapsed);
  $('phase').textContent = state.phase === 'ready' ? 'Ready' : state.label;
  $('phase').className = 'phase ' + state.className;
  $('seconds').textContent = state.phase === 'ready' ? durationFor('lift') : state.remaining;
  $('setCount').textContent = `${state.set} / ${e.sets}`;
  $('repCount').textContent = `${state.rep} / ${e.reps}`;
  $('load').textContent = e.load;
  $('angle').textContent = `${e.start}° → ${e.end}°`;
  $('tempo').textContent = `${e.lift}s up · ${e.hold}s hold · ${e.lower}s down`;
  $('coachNote').textContent = e.note;
  $('playPause').textContent = state.running ? 'Pause' : 'Start';
  $('skipPhase').textContent = state.ex === exercises.length - 1 ? 'Finish workout' : 'Next exercise';
  $('toggleVoice').textContent = `Voice prompts: ${state.voice ? 'on' : 'off'}`;
  const progress = state.duration ? Math.max(0, Math.min(1, 1 - state.remaining / state.duration)) : 0;
  $('ringProgress').style.strokeDasharray = CIRC;
  $('ringProgress').style.strokeDashoffset = CIRC * (1 - progress);
  $('ringProgress').style.stroke = state.className === 'lift' ? '#22c55e' : state.className === 'hold' ? '#f59e0b' : state.className === 'rest' ? '#ef4444' : '#38bdf8';
  save();
}
function advance(){
  const e = current();
  if(state.phase === 'lift'){
    e.hold > 0 ? setPhase('hold','Hold','hold') : setPhase('lower','Lower','lower');
    return;
  }
  if(state.phase === 'hold'){
    setPhase('lower','Lower','lower');
    return;
  }
  if(state.phase === 'lower'){
    state.rep++;
    if(state.rep <= e.reps){ firstPhase(); return; }
    state.rep = 1;
    state.set++;
    if(state.set <= e.sets){ setPhase('rest','Rest','rest'); return; }
    state.set = 1;
    state.ex++;
    if(state.ex >= exercises.length){ finish(); return; }
    if(e.rest > 0) setPhase('rest','Rest','rest'); else firstPhase();
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
    speak(`${current().name}. Set ${state.set}, rep ${state.rep}. Let's go.`);
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
  state = { ...state, screen:'setup', ex:0, set:1, rep:1, phase:'ready', label:'Ready', className:'', remaining:0, duration:1, running:false, elapsed:0, interval:null };
  if(all) localStorage.removeItem('trainingCoachState');
  show('setup');
  render();
}
function finish(){
  stopTimer(false);
  state.screen = 'done';
  speak('Workout complete. Great job.');
  vibrate([80,60,120]);
  localStorage.removeItem('trainingCoachState');
  show('done');
}
function bind(id, fn){
  const el = $(id);
  ['click','touchend'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); fn(); }, { passive:false }));
}

load();
loadVoices();
if('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;
renderPlan();
bind('startWorkout', ()=>{ goToExercise(0); });
bind('toggleVoice', ()=>{ state.voice = !state.voice; if(state.voice) speak('Voice prompts are on.'); render(); });
bind('backToSetup', ()=>{ stopTimer(false); show('setup'); render(); });
bind('playPause', toggleTimer);
bind('skipPhase', goToNextExercise);
bind('resetWorkout', ()=>reset(true));
bind('restart', ()=>reset(true));
show(state.screen || 'setup');
render();
