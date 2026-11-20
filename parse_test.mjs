import fs from 'fs';
const html = fs.readFileSync('index.html', 'utf8');
const block = html.slice(html.indexOf('// OCR-PARSER-BEGIN'), html.indexOf('// OCR-PARSER-END'));
const { parseLab, normNumber } = new Function(block + '\nreturn { parseLab, normNumber };')();
let fail = 0;
const eq = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ' expected ' + JSON.stringify(exp)}`);
};
// etykiety
eq('etykiety w liniach', parseLab('L* 52.31\na* -1.20\nb* 3.40'), { L: 52.31, a: -1.2, b: 3.4 });
eq('przecinek, znak =', parseLab('L*=52,31 a*=-1,2 b*=3,4'), { L: 52.31, a: -1.2, b: 3.4 });
eq('etykiety w jednej linii, minus typu −', parseLab('L*  52.31  a*  −1.20  b*  3.40'), { L: 52.31, a: -1.2, b: 3.4 });
// bez etykiet, jedna liczba w wierszu
eq('pojedyncze liczby kolejno L,a,b', parseLab('52.31\n-1.20\n3.40'), { L: 52.31, a: -1.2, b: 3.4 });
// zrzut spektrofotometru: 2 kolumny, wiersz L, a, b, GU
eq('ekran 10°/D65 (bez znaków dziesiętnych)', parseLab('9457 94,52\n-2.09 -1.81\n1.05 0,54\n94.25 94.25'), { L: 94.57, a: -2.09, b: 1.05 });
eq('ekran z separatorem kropką', parseLab('94.57 94.52\n-2.09 -1.81\n1.05 0.54\n94.25 94.25'), { L: 94.57, a: -2.09, b: 1.05 });
eq('linie z datą i nagłówkiem ignorowane', parseLab('0001 DA WHITE ABS..\n18/11/2026 15:32:49\n9457 94,52\n-2.09 -1.81\n1.05 0,54\n94.25 94.25'), { L: 94.57, a: -2.09, b: 1.05 });
// L nieczytelne: nie wolno zgadywać (wartość pusta, a nie błędna)
const unreliable = parseLab('945? 9452\n-2.09 -1.81\n1.05 0,54\n94.25 94.25');
eq('nieczytelny wiersz L nie daje zgadniętej wartości', unreliable.L, null);
// normalizacja liczb
eq('9457 -> 94.57', normNumber('9457'), 94.57);
eq('-209 -> -2.09', normNumber('-209'), -2.09);
eq('105 -> 1.05', normNumber('105'), 1.05);
eq('tekst -> null', normNumber('DA'), null);
console.log(fail ? `\n${fail} FAILED` : '\nTESTY PARSERA PRZESZŁY');
process.exit(fail ? 1 : 0);
