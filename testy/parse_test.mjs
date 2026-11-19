function parseLab(raw) {
  const t = raw.replace(/[–—−]/g, '-').replace(/,/g, '.').replace(/\s+/g, ' ');
  const num = '(-?\\d+(?:\\.\\d+)?)';
  const find = letter => {
    const m = t.match(new RegExp(`\\b${letter}\\s*[\\*'\`’$]?\\s*[=:]?\\s*${num}`, 'i'));
    return m ? parseFloat(m[1]) : null;
  };
  let L = find('L'), a = find('a'), b = find('b');
  if (L === null || a === null || b === null) {
    const nums = (t.match(/-?\d+(?:\.\d+)?/g) || []).map(parseFloat);
    if (nums.length >= 3) [L, a, b] = nums;
  }
  return { L, a, b };
}

const cases = [
  ["L* 52.31\na* -1.20\nb* 3.40", [52.31,-1.2,3.4]],
  ["L*=52,31 a*=-1,2 b*=3,4", [52.31,-1.2,3.4]],
  ["52.31\n-1.20\n3.40", [52.31,-1.2,3.4]],
  ["L*  52.31  a*  −1.20  b*  3.40", [52.31,-1.2,3.4]],
];
let fail=0;
for (const [txt,exp] of cases){
  const r=parseLab(txt); const got=[r.L,r.a,r.b];
  const ok=got.every((v,i)=>Math.abs(v-exp[i])<1e-9);
  if(!ok) fail++;
  console.log(ok?'PASS':'FAIL', JSON.stringify(txt), '->', got);
}
process.exit(fail?1:0);
