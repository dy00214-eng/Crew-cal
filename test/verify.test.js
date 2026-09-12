const test = require('node:test');
const assert = require('node:assert');
const verify = require('../src/verify.js');
const parser = require('../src/parser.js');

test('원본 글을 고치지 않고 본 대로 센다', () => {
  const map = verify.readSource('2026-03-01\tKE1807 KE1810 KE1815 KE1820\n2026-03-02\tKE0497 LO');
  assert.deepStrictEqual(map['2026-03-01'], ['KE1807', 'KE1810', 'KE1815', 'KE1820']);
  assert.deepStrictEqual(map['2026-03-02'], ['KE0497', 'LO']);

  // 날짜만 있는 줄도 연·월을 주면 읽는다. 시각과 구간은 세지 않는다.
  const day = verify.readSource('1 KE0035 ICN/ATL 0945-1020', { year: 2026, month: 3 });
  assert.deepStrictEqual(day['2026-03-01'], ['KE0035']);
});

test('건수가 다른 날을 짚어 낸다', () => {
  const source = verify.readSource('2026-03-01\tKE1807 KE1810 KE1815 KE1820');
  const parsed = { '2026-03-01': ['KE1807', 'KE1810'] };
  const out = verify.compare(source, parsed, null);
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.mismatches, 1);
  assert.deepStrictEqual(out.rows[0].missing, ['KE1815', 'KE1820']);
  assert.match(verify.headline(out), /원본 4건 → 파싱 2건 · 불일치 1일/);
});

test('실제 파서를 태워도 한 건도 새지 않는다', () => {
  const text = [
    '2026-03-01\tKE1807 KE1810 KE1815 KE1820',
    '2026-03-08\tKE0125 KE0126',
    '2026-03-15\tATDO',
    '2026-03-17\tADO'
  ].join('\n');
  const out = verify.compare(
    verify.readSource(text),
    verify.readEntries(parser.parse(text, { year: 2026, month: 3 }).entries),
    null);
  assert.strictEqual(out.ok, true, JSON.stringify(out.rows.filter((r) => !r.ok)));
  assert.strictEqual(out.sourceCount, out.parsedCount);
});
