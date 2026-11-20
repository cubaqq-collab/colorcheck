import { deltaE76, deltaE2000, labToHex } from './color.js';
let fail = 0;
const eq = (name, got, exp, tol) => {
  const ok = Math.abs(got - exp) <= tol;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${got.toFixed(4)}, expected ${exp} (±${tol})`);
};
// Sharma et al. 2005, tabela referencyjna ΔE00
eq('Sharma #1', deltaE2000({L:50,a:2.6772,b:-79.7751},{L:50,a:0,b:-82.7485}), 2.0425, 0.0005);
eq('Sharma #2', deltaE2000({L:50,a:3.1571,b:-77.2803},{L:50,a:0,b:-82.7485}), 2.8615, 0.0005);
eq('Sharma #3', deltaE2000({L:50,a:2.8361,b:-74.0200},{L:50,a:0,b:-82.7485}), 3.4412, 0.0005);
eq('Sharma #4 (L)', deltaE2000({L:50,a:-1.3802,b:-84.2814},{L:50,a:0,b:-82.7485}), 1.0000, 0.0005);
eq('Sharma #5 (L)', deltaE2000({L:50,a:-1.1848,b:-84.8006},{L:50,a:0,b:-82.7485}), 1.0000, 0.0005);
eq('identyczne = 0', deltaE2000({L:60,a:10,b:-5},{L:60,a:10,b:-5}), 0, 1e-9);
eq('ΔE76 prosty', deltaE76({L:50,a:0,b:0},{L:53,a:4,b:0}), 5, 1e-9);
// symetria
const p = {L:40,a:20,b:-30}, q = {L:45,a:15,b:-25};
eq('symetria ΔE2000', deltaE2000(p,q) - deltaE2000(q,p), 0, 1e-9);
// podgląd kolorów: biel, czerń, szarość, czerwień
console.log('hex white', labToHex(100,0,0), labToHex(0,0,0), labToHex(53.24,80.09,67.20));
if (labToHex(100,0,0) !== '#ffffff') { fail++; console.log('FAIL white'); }
if (labToHex(0,0,0) !== '#000000') { fail++; console.log('FAIL black'); }
if (labToHex(53.24,80.09,67.20) !== '#ff0000') { fail++; console.log('FAIL red'); }
// zakresy bez wyjścia poza 0..255
for (let L=0; L<=100; L+=10) for (let a=-100; a<=100; a+=50) for (let b=-100; b<=100; b+=50) {
  if (!/^#[0-9a-f]{6}$/.test(labToHex(L,a,b))) { fail++; console.log('FAIL format', L,a,b); }
}
console.log(fail ? `\n${fail} FAILED` : '\nWSZYSTKIE TESTY PRZESZŁY');
process.exit(fail ? 1 : 0);
