/**
 * index.html + styles.css + src/*.js 를 한 파일로 묶는다.
 *
 *   node build.js            -> dist/crew-cal.html
 *
 * 만들어진 파일은 <head> 없이 본문만 담은 조각이라 아티팩트로 그대로 올릴 수 있고,
 * 맨 앞에 charset 과 viewport 를 두어, 파일을 브라우저로 바로 열어도 한글이 깨지지 않고
 * 폰에서 모바일 레이아웃으로 뜬다. (아티팩트에서는 같은 메타가 이미 있어 무시된다.)
 */
const fs = require('fs');
const path = require('path');

// 노선·공항 자료를 data/*.json 에서 src/routedata.js 로 먼저 옮겨 적는다.
// 노선을 더할 때 JSON 만 고치면 되도록.
require('./scripts/make-routes.js').build();

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, 'Crew-cal'])[1].trim();

let body = (html.match(/<body>([\s\S]*)<\/body>/) || [, ''])[1];
if (!body.trim()) throw new Error('index.html 에서 body 를 찾지 못했습니다.');

// 외부 스크립트 태그는 걷어내고, 순서를 지켜 인라인으로 다시 붙인다.
const scriptSrcs = [...body.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
if (!scriptSrcs.length) throw new Error('index.html 에서 스크립트를 찾지 못했습니다.');
body = body.replace(/\s*<script src="[^"]+"><\/script>/g, '');

const styles = read('styles.css');
const scripts = scriptSrcs
  .map((src) => '<script>\n' + read(src).trimEnd() + '\n</script>')
  .join('\n');

const out = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>' + title + '</title>',
  '<style>',
  styles.trimEnd(),
  '</style>',
  body.trim(),
  scripts,
  ''
].join('\n');

const target = path.join(root, 'dist', 'crew-cal.html');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
console.log(
  '만들었습니다: ' + path.relative(root, target) +
  ' (' + Math.round(Buffer.byteLength(out) / 1024) + 'KB, 스크립트 ' + scriptSrcs.length + '개)'
);
