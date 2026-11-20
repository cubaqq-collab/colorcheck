import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('index.html', 'utf8')
  .replace(/<script src="[^"]*"><\/script>/, '')
  .replace(/<script type="module">[\s\S]*?<\/script>/, '');
const color = fs.readFileSync('color.js', 'utf8');
const page = fs.readFileSync('page_module.mjs', 'utf8');
const src = fs.readFileSync('index.html', 'utf8');
const script = src.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let fail = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fail++; };

const dom = new JSDOM(html, { url: 'https://test.local/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.alert = () => {}; w.confirm = () => true;
w.URL.createObjectURL = () => 'blob:x';
// brak klucza 'patterns' = pierwsze uruchomienie
const inline = (color + '\n' + script).replace(/^import .*$/mg, '').replace(/^export /mg, '');
w.eval(inline);
await new Promise(r => setTimeout(r, 200));
const $ = id => w.document.getElementById(id);
const setVal = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input')); };

ok($('pat').options.length === 3, 'start: "Dodaj / wybierz wzór", "+ Dodaj nowy wzór", DA WHITE ABS');
ok($('pat').value === '', 'na starcie nic nie jest wybrane');
ok($('tL').textContent === '–', 'na starcie target pusty');
$('pat').value = 'da-white-abs'; $('pat').dispatchEvent(new w.Event('change'));
ok($('pat').value === 'da-white-abs', 'DA WHITE ABS wybrany z listy');
ok($('addBlock').hidden, 'panel dodawania ukryty, bo jest wzorzec');
ok($('tL').textContent === '94.73' && $('ta').textContent === '-1.87' && $('tb').textContent === '0.10', 'target = 94.73 / -1.87 / 0.10');

setVal('mL', 94.75); setVal('ma', -2.09); setVal('mb', 0.90);
ok($('dL').textContent === '+0.02', 'dL = +0.02');
ok($('da').textContent === '-0.22', 'da = -0.22');
ok($('db').textContent === '+0.80', 'db = +0.80');
ok($('e76').textContent.includes('0.83'), 'dE76 = 0.83');
ok($('e00').textContent.includes('0.81'), 'dE2000 = 0.81');
ok($('e00').querySelector('span:not(.pair)').classList.contains('bad-de'), 'dE2000 czerwone');
ok(JSON.parse(w.localStorage.getItem('patterns')).length === 1, 'wzorzec startowy zapisany w pamięci');

console.log(fail ? `\n${fail} FAILED` : '\nTEST STARTOWY PRZESZEDŁ');
process.exit(fail ? 1 : 0);
