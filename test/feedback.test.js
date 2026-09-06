const test = require('node:test');
const assert = require('node:assert');
const feedback = require('../src/feedback.js');

test('고른 종류와 적은 말이 함께 담긴다', () => {
  const text = feedback.compose({ kind: 'idea', message: '월별 합계도 보고 싶어요' });
  assert.match(text, /^\[크루캘 의견\]/);
  assert.match(text, /종류: 이런 게 있으면 좋겠어요/);
  assert.match(text, /월별 합계도 보고 싶어요/);
});

test('모르는 종류는 "그 밖에" 로 적는다', () => {
  assert.strictEqual(feedback.kindLabel('없는값'), '그 밖에');
  assert.strictEqual(feedback.kindLabel('parse'), '스케줄이 제대로 안 읽혀요');
});

test('안 읽힌 스케줄은 어디서부터 어디까지인지 표시해 붙인다', () => {
  const text = feedback.compose({ kind: 'parse', message: '6일이 비어요', schedule: '6 TVL\n7 LO' });
  assert.match(text, /--- 안 읽힌 스케줄 원문 ---\n6 TVL\n7 LO\n--- 여기까지 ---/);
});

test('스케줄 원문은 안 읽히는 문제일 때만 권한다', () => {
  assert.strictEqual(feedback.suggestsSchedule('parse'), true);
  assert.strictEqual(feedback.suggestsSchedule('idea'), false);
  assert.strictEqual(feedback.suggestsSchedule('없는값'), false);
});

test('참고 정보는 있는 것만 줄로 넣는다', () => {
  const text = feedback.compose({
    kind: 'bug',
    message: '달력이 깨져요',
    context: { at: '2026-09-06 13:40', version: '2026-09-06', entries: 31, screen: '390x844', ua: 'Safari/iPhone' }
  });
  assert.match(text, /보낸 때: 2026-09-06 13:40/);
  assert.match(text, /버전: 2026-09-06/);
  assert.match(text, /저장된 일정: 31건/);
  assert.match(text, /화면: 390x844/);
  assert.match(text, /브라우저: Safari\/iPhone/);
  assert.doesNotMatch(text, /홈 화면 앱/);

  const bare = feedback.compose({ kind: 'bug', message: '달력이 깨져요' });
  assert.doesNotMatch(bare, /— 참고 —/);
});

test('아주 긴 글은 잘라서 보낸다', () => {
  const text = feedback.compose({ kind: 'etc', message: 'ㄱ'.repeat(2500) });
  assert.match(text, /…\(500자 줄임\)/);
});

test('아무 말도 없으면 보내지 않는다', () => {
  assert.strictEqual(feedback.isSendable({ kind: 'idea', message: '   ' }), false);
  assert.strictEqual(feedback.isSendable({ kind: 'idea', message: '좋아요' }), true);
  assert.strictEqual(feedback.isSendable({ kind: 'parse', schedule: '6 TVL' }), true);
  assert.strictEqual(feedback.isSendable(), false);
});

test('메일 앱 주소는 제목과 본문을 채워서 연다', () => {
  const url = feedback.mailtoUrl('a@b.com', '[크루캘 의견]\n\n종류: 그 밖에');
  assert.match(url, /^mailto:a@b\.com\?subject=/);
  assert.match(url, /&body=/);
  const body = decodeURIComponent(url.split('&body=')[1]);
  assert.strictEqual(body, '[크루캘 의견]\n\n종류: 그 밖에');
});

test('본문이 너무 길면 잘라서 넘긴다', () => {
  const url = feedback.mailtoUrl('a@b.com', 'ㄱ'.repeat(200), 50);
  const body = decodeURIComponent(url.split('&body=')[1]);
  assert.strictEqual(body.length, 50 + '\n…(뒷부분 줄임)'.length);
  assert.match(body, /…\(뒷부분 줄임\)$/);
});
