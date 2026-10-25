import fs from 'node:fs';
import path from 'node:path';
const images = path.resolve(process.cwd(), 'public', 'images');
const originals = fs.readdirSync(images).filter(x=>x.endsWith('.webp')&&!x.endsWith('-sm.webp')&&x!=='technica-logo.webp'&&x!=='auth-refinery.webp');
let missing=0;
for(const img of originals){
 const mobile=img.replace(/\.webp$/,'-sm.webp');
 for(const file of [img,mobile]){
  if (!fs.existsSync(path.join(images,file)) || fs.statSync(path.join(images,file)).size<1024) {
   console.error('Missing/invalid:',file);missing++;
  }
 }
}
for(const img of ['auth-refinery.webp','auth-refinery-sm.webp','technica-icon.png','technica-logo.webp']){if(!fs.existsSync(path.join(images,img))||fs.statSync(path.join(images,img)).size<1024){console.error('Missing/invalid auth asset:',img);missing++;}}
if(missing || originals.length!==11)process.exit(1);
console.log(`PASS: ${originals.length} HD WebP images + ${originals.length} mobile WebP image variants and auth images.`);
