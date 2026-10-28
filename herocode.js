/* Короткий код героя: JSON → deflate-raw → base64url с префиксом H2 (или H1 без сжатия). Понимает и старый формат (чистый base64). */
(function(){
"use strict";
function b64urlFromBytes(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function bytesFromB64url(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
async function pipe(u8,stream){const r=new Response(new Blob([u8]).stream().pipeThrough(stream));return new Uint8Array(await r.arrayBuffer())}
const canZip=typeof CompressionStream==='function'&&typeof DecompressionStream==='function';
async function encode(hero){
  if(!hero||typeof hero!=='object')throw new Error('Нет героя для кода.');
  const raw=new TextEncoder().encode(JSON.stringify(hero));
  if(canZip){try{return 'H2'+b64urlFromBytes(await pipe(raw,new CompressionStream('deflate-raw')))}catch(e){}}
  return 'H1'+b64urlFromBytes(raw)}
async function decode(str){
  const s=String(str||'').replace(/\s+/g,'');
  if(!s)throw new Error('Код героя пустой — вставьте его целиком.');
  let json;
  try{
    if(s.startsWith('H2')){
      if(!canZip)throw new Error('Этот браузер не умеет распаковывать сжатый код. Обновите браузер или откройте страницу в Chrome.');
      json=new TextDecoder().decode(await pipe(bytesFromB64url(s.slice(2)),new DecompressionStream('deflate-raw')))}
    else if(s.startsWith('H1'))json=new TextDecoder().decode(bytesFromB64url(s.slice(2)));
    else json=decodeURIComponent(escape(atob(s)))}
  catch(e){if(e&&/браузер/.test(e.message))throw e;throw new Error('Код героя повреждён или скопирован не полностью.')}
  let hero;try{hero=JSON.parse(json)}catch(e){throw new Error('Код героя повреждён или скопирован не полностью.')}
  if(!hero||typeof hero!=='object'||!hero.name)throw new Error('Это не код героя: в нём нет имени персонажа.');
  return hero}
window.HeroCode={encode,decode};
})();
