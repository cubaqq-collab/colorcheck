import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('index.html', 'utf8')
  .replace(/<script src="[^"]*"><\/script>/, '')          // bez CDN Tesseract
  .replace(/<script type="module">[\s\S]*?<\/script>/, ''); // skrypt wstrzyknie test
let fail = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fail++; };

const dom = new JSDOM(html, { url: 'https://test.local/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.localStorage.setItem('patterns', '[]'); // stan pusty dla testów listy
w.alert = () => {}; w.confirm = () => true;
w.Image = class { get width(){return 800;} get height(){return 600;} set src(v){} decode(){ return Promise.resolve(); } };
w.URL.createObjectURL = () => 'blob:x';
w.Tesseract = { createWorker: async () => ({ setParameters(){}, recognize: async () => ({ data: { text: 'L* 52.31\na* -1.20\nb* 3.40' } }), terminate(){} }) };

// Moduł ładujemy jako data-URL z przepisanym importem color.js
const color = fs.readFileSync('color.js', 'utf8');
const page = fs.readFileSync('index.html', 'utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const sandbox = w;
sandbox.__mod = page;
// jsdom nie wykonuje type=module, więc: usuwamy import/export i uruchamiamy jako zwykły skrypt
const inline = (color + '\n' + page)
  .replace(/^import .*$/mg, '')
  .replace(/^export /mg, '')
  .replace(/^(\s*)export /mg, '$1');
// atrapa html2canvas: rejestruje wywołania, zwraca blob
w.__shots = [];
w.html2canvas = async (el) => { w.__shots.push(el); return { toBlob: cb => cb(new w.Blob(['x'], { type: 'image/jpeg' })) }; };
try { w.eval(inline); } catch (e) { console.log('RUNTIME ERROR:', e.message); process.exit(1); }
await new Promise(r => setTimeout(r, 200));

const currentIdForTest = () => JSON.parse(w.localStorage.getItem('patterns'))[0].id;
const $ = id => w.document.getElementById(id);
const setVal = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input')); };

// 1. Brak wzorców -> panel dodawania widoczny
ok(!$('addBlock').hidden, 'po starcie: panel dodawania widoczny');
ok($('pat').value === '__add__', 'po starcie zaznaczone "+ Dodaj / wybierz nowy wzór"');
ok($('pat').options[0].value === '__add__' && $('pat').options[0].text === '+ Dodaj / wybierz nowy wzór', 'pierwsza pozycja: "+ Dodaj / wybierz nowy wzór"');

// 2. Dodanie wzorca
const addTo = (name, L, a, b) => {
  $('pname').value = name; $('pL').value = L; $('pa').value = a; $('pb').value = b;
  $('savePat').click();
};
addTo('Biały', 95, 0, 2);
ok($('addBlock').hidden, 'po zapisaniu panel dodawania się chowa');
ok($('pat').value !== '__add__', 'po zapisaniu wybrany jest nowy wzorzec');
ok($('tL').textContent === '95.00' && $('ta').textContent === '0.00', 'target pokazuje L/a/b wzorca');

// 3. Brak pomiaru -> kreski
ok($('dL').textContent === '–' && $('e00').textContent.includes('–') === false || $('e00').textContent === '–', 'bez pomiaru wyniki = –');

// 4. Pomiar i odchylenia
setVal('mL', 96); setVal('ma', 0); setVal('mb', 2);
ok($('dL').textContent === '+1.00', 'dL = pomiar − wzorzec (+1.00)');
ok($('da').textContent === '+0.00', 'da = 0');
ok($('db').textContent === '+0.00', 'db = 0');

// 5. Próg 0,8: mała różnica -> nie czerwone
const e00small = $('e00').querySelector('span.bad-de, span:not(.pair)');
ok(!e00small.classList.contains('bad-de'), 'dE2000 <= 0,8 nie jest czerwone');

// 6. Duża różnica -> czerwone
setVal('mL', 90);
const e00big = $('e00').querySelector('span.bad-de, span:not(.pair)');
const e76big = $('e76').querySelector('span.bad-de, span:not(.pair)');
ok(e00big.classList.contains('bad-de'), 'dE2000 > 0,8 jest czerwone');
ok(e76big.classList.contains('bad-de'), 'dE76 > 0,8 jest czerwone');

// 7. Dodanie drugiego wzorca, przełączanie listy
addTo('Szary', 50, 0, 0);
ok($('pat').options.length === 3, 'lista: dodaj + 2 wzorce');
$('pat').value = $('pat').options[1].value; $('pat').dispatchEvent(new w.Event('change'));
ok($('tL').textContent !== '–', 'wybór wzorca z listy ustawia target');
ok($('addBlock').hidden, 'wybór wzorca chowa panel dodawania');

// 8. Wybór "+ Dodaj wzór" pokazuje panel
$('pat').value = '__add__'; $('pat').dispatchEvent(new w.Event('change'));
ok(!$('addBlock').hidden, 'wybór "+ Dodaj wzór" pokazuje panel');

// 9. Przechowywanie w localStorage
const saved = JSON.parse(w.localStorage.getItem('patterns') || '[]');
ok(saved.length === 2, 'wzorce zapisane w localStorage (2)');

// 10. Kierunek kolorów: ujemne dL -> ciemny chip
$('pat').value = saved[0].id; $('pat').dispatchEvent(new w.Event('change'));
setVal('mL', 80);
ok($('cL').innerHTML.includes('#141414') || $('cL').innerHTML.includes('background:#'), 'chip kierunku dL renderowany');

// 11. Usuwanie wzorca
ok($('savePat').hidden, 'w trybie wzoru przycisk "Zapisz wzór" ukryty');
ok(![...w.document.querySelectorAll('button')].some(b => b.textContent.includes('Usuń wybrany wzór')), 'stary tekstowy przycisk usuwania usunięty');

// 12. Przypadek użytkownika: wzór 'DA WHITE ABS' vs odczyt ze zdjęcia
$('pat').onchange && null;
$('pname').value = 'DA WHITE ABS'; $('pL').value = 94.73; $('pa').value = -1.87; $('pb').value = 0.10;
$('savePat').click();
setVal('mL', 94.75); setVal('ma', -2.09); setVal('mb', 0.90);
ok($('dL').textContent === '+0.02', 'DA WHITE: dL = +0.02');
ok($('da').textContent === '-0.22', 'DA WHITE: da = -0.22');
ok($('db').textContent === '+0.80', 'DA WHITE: db = +0.80');
ok($('e76').textContent.includes('0.83'), 'DA WHITE: dE76 = 0.83');
ok($('e00').textContent.includes('0.81'), 'DA WHITE: dE2000 = 0.81');
ok($('e76').querySelector('span:not(.pair)').classList.contains('bad-de'), 'DA WHITE: dE76 czerwone (> 0,8)');
ok($('e00').querySelector('span:not(.pair)').classList.contains('bad-de'), 'DA WHITE: dE2000 czerwone (> 0,8)');

// 13. Zdjęcie wzoru w trybie dodawania: OCR wypełnia L/a/b, zapis przyciskiem "Zapisz wzór"
w.HTMLCanvasElement.prototype.getContext = () => ({
  drawImage(){}, putImageData(){},
  getImageData(x, y, wd, h) { return { data: new Uint8ClampedArray(Math.max(0, wd * h * 4)) }; }
});
$('pat').value = '__add__'; $('pat').dispatchEvent(new w.Event('change'));
ok(!$('savePat').hidden, 'w trybie dodawania przycisk "Zapisz wzór" widoczny');
ok($('pat').options[0].text === '+ Dodaj / wybierz nowy wzór', 'opcja: "+ Dodaj / wybierz nowy wzór"');
const pph = $('pphoto');
Object.defineProperty(pph, 'files', { value: [{ name: 'wzor.jpg' }], configurable: true });
pph.dispatchEvent(new w.Event('change'));
await new Promise(r => setTimeout(r, 300));
ok($('pL').value === '52.31' && $('pa').value === '-1.2' && $('pb').value === '3.4', 'zdjęcie wzoru wypełnia pola L/a/b');
const countBefore = JSON.parse(w.localStorage.getItem('patterns')).length;
$('pname').value = 'Test ze zdjęcia';
$('savePat').click();
const after = JSON.parse(w.localStorage.getItem('patterns'));
ok(after.length === countBefore + 1, 'Zapisz wzór dodaje wzorzec ze zdjęcia');
ok(after[after.length-1].L === 52.31 && after[after.length-1].name === 'Test ze zdjęcia', 'zapisany wzorzec ma L/a/b ze zdjęcia i nazwę');

// 14. Dodawanie w tym samym panelu: brak osobnej karty, pomiar ukryty w trybie dodawania
$('pat').value = '__add__'; $('pat').dispatchEvent(new w.Event('change'));
ok(!$('addBlock').hidden, 'tryb dodawania: formularz w lewym panelu widoczny');
ok($('measBlock').hidden, 'tryb dodawania: sekcja pomiaru ukryta');
ok(!w.document.querySelector('.wrap > section:nth-child(2)'), 'brak osobnej prawej karty dodawania');
$('pat').value = currentIdForTest(); $('pat').dispatchEvent(new w.Event('change'));
ok($('addBlock').hidden && !$('measBlock').hidden, 'po wyborze wzoru wraca widok pomiaru');

// 15. Tryb dodawania: nazwa w miejscu miniatury, "Zapisz wzór" pod zdjęciem
$('pat').value = '__add__'; $('pat').dispatchEvent(new w.Event('change'));
ok($('patSw').hidden && !$('pname').hidden, 'tryb dodawania: pole nazwy zamiast miniatury');
const savePos = $('savePat').compareDocumentPosition($('pphoto'));
ok(savePos & w.Node.DOCUMENT_POSITION_PRECEDING, 'przycisk "Zapisz wzór" jest pod opcją zrób zdjęcie');
ok(w.document.querySelector('button.tall') === $('savePat'), 'przycisk "Zapisz wzór" ma klasę tall (2x wysokość)');
$('pat').value = currentIdForTest(); $('pat').dispatchEvent(new w.Event('change'));
ok(!$('patSw').hidden && $('pname').hidden, 'wzór wybrany: miniatura widoczna, pole nazwy ukryte');

// 16. Ujemne wartości i przecinek w polu tekstowym
ok(w.document.getElementById('mL').type === 'text' && w.document.getElementById('ma').type === 'text', 'pola L/a/b są tekstowe (działa minus na telefonie)');
$('pat').value = currentIdForTest(); $('pat').dispatchEvent(new w.Event('change'));
setVal('mL', '94,57'); setVal('ma', '−2,09'); setVal('mb', '1,05');
ok($('ma').value && !$('da').textContent.includes('–'), 'wartość ujemna z przecinkiem i Unicode minus jest przeliczana');
ok($('da').textContent.startsWith('-') || $('da').textContent.startsWith('+'), 'da wyliczona z ujemnej wartości');
setVal('ma', '-2.09');
ok($('da').textContent !== '–', 'minus ASCII też działa');
// 17. Zdjęcie z pamięci: brak capture (wybór galerii na Androidzie)
ok(!w.document.getElementById('photo').hasAttribute('capture') && !w.document.getElementById('pphoto').hasAttribute('capture'), 'pola zdjęć bez capture (galeria dostępna)');
// 18. Trzy stopnie intensywności (względem L wybranego wzoru)
$('pat').value = currentIdForTest(); $('pat').dispatchEvent(new w.Event('change'));
const baseL = parseFloat($('tL').textContent);
const chipFor = d => { setVal('mL', (baseL + d).toFixed(2)); return $('cL').querySelector('.chip1').style.background; };
const hexOf = c => { const m = c.match(/\d+/g); return m ? '#' + m.map(x => (+x).toString(16).padStart(2, '0')).join('') : c; };
const cases = [[0.3,'#fff59d'],[0.7,'#ffeb3b'],[1.5,'#ffd600'],[-0.3,'#9e9e9e'],[-0.7,'#424242'],[-1.5,'#000000']];
for (const [d, exp] of cases) {
  const got = hexOf(chipFor(d));
  ok(got === exp, `dL ${d>0?'+':''}${d} -> stopień ${Math.abs(d)<0.5?'słaby':Math.abs(d)<1?'średni':'mocny'} (${got} = ${exp})`);
}

// 19. Kosz: widoczny tylko przy wybranym zapisanym wzorze, z potwierdzeniem
const trashOk = () => $('delPat');
$('pat').value = currentIdForTest(); $('pat').dispatchEvent(new w.Event('change'));
ok(!$('delPat').hidden, 'kosz widoczny przy wybranym wzorze');
ok(w.document.querySelector('.pat-row #delPat svg') !== null, 'kosz to czerwona ikona SVG w wierszu listy');
ok($('delPat').getAttribute('aria-label') === 'Usuń wybrany wzór', 'kosz ma etykietę dostępności');
const before = JSON.parse(w.localStorage.getItem('patterns')).length;
$('delPat').click();
ok(!$('confirm').hidden, 'klik kosza otwiera potwierdzenie');
ok($('confirmText').textContent.includes('Tej operacji nie można cofnąć'), 'potwierdzenie ostrzega o nieodwracalności');
$('cancelDel').click();
ok($('confirm').hidden, 'Anuluj zamyka okno');
ok(JSON.parse(w.localStorage.getItem('patterns')).length === before, 'Anuluj nie usuwa wzorca');
$('delPat').click();
$('okDel').click();
ok(JSON.parse(w.localStorage.getItem('patterns')).length === before - 1, 'Usuń kasuje wzorzec');
ok($('confirm').hidden, 'po Usuń okno się zamyka');
$('pat').value = '__add__'; $('pat').dispatchEvent(new w.Event('change'));
ok($('delPat').hidden, 'w trybie dodawania kosz ukryty');

// 20. Zapisz pomiar: przycisk między wynikami a legendą, zrzut panelu do JPG
ok(!!$('savePhoto'), 'przycisk "Zapisz pomiar" istnieje');
ok($('e00').compareDocumentPosition($('savePhoto')) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'przycisk jest za wynikami dE');
ok($('savePhoto').compareDocumentPosition($('legend') || w.document.querySelector('.legend')) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'przycisk jest przed legendą');
$('pat').value = currentIdForTest(); $('pat').dispatchEvent(new w.Event('change'));
const shotsBefore = w.__shots.length;
$('savePhoto').click();
await new Promise(r => setTimeout(r, 50));
ok(w.__shots.length === shotsBefore + 1, 'Zapisz pomiar wywołuje zrzut');
ok(w.__shots[w.__shots.length - 1].tagName === 'SECTION', 'zrzut obejmuje cały panel (section)');
ok($('savePhoto').style.visibility === '', 'przycisk przywracany po zrzucie');

console.log(fail ? `\n${fail} FAILED` : '\nTESTY STRONY PRZESZŁY');
process.exit(fail ? 1 : 0);
