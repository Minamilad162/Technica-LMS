// Spreadsheet import for local demo data, without a CDN or a remote service.
// Supports real XLSX (ZIP / worksheet XML / shared strings) and RFC4180-style CSV.
const clean=x=>String(x??'').replace(/^\uFEFF/,'').trim();
const key=x=>clean(x).toLowerCase().replace(/[^a-z0-9]/g,'');
const fieldAliases={
 prompt:['question','questiontext','prompt','text'],
 option1:['option1','answer1','choice1','optiona','answera','choicea','a'],
 option2:['option2','answer2','choice2','optionb','answerb','choiceb','b'],
 option3:['option3','answer3','choice3','optionc','answerc','choicec','c'],
 option4:['option4','answer4','choice4','optiond','answerd','choiced','d'],
 correct:['correctanswer','correctoption','correctchoice','answer','correct','key'],
 explanation:['explanation','rationale','reason','feedback'],
 domain:['domain','topic','subject','section'],
};
export function normalizeQuestionRows(rows,{courseId,domainId,sourceName='Excel',sheetName='Questions'}={}){
 const out=[],problems=[];
 const headerIndex=rows.findIndex(row=>row.some(cell=>fieldAliases.prompt.includes(key(cell))));
 if(headerIndex<0)return {questions:[],problems:[`${sheetName}: Cannot find Question column.`]};
 const header=rows[headerIndex].map(key);
 const col={};
 for(const [name,aliases] of Object.entries(fieldAliases))col[name]=header.findIndex(v=>aliases.includes(v));
 for(const needed of ['prompt','option1','option2','option3','correct'])if(col[needed]<0)
  return {questions:[],problems:[`${sheetName}: Missing required column (${needed}).`]};
 const seen=new Set();
 for(let i=headerIndex+1;i<rows.length;i++){
  const row=rows[i],get=name=>col[name]<0?'':clean(row[col[name]]);
  if(!row.some(v=>clean(v)))continue;
  const prompt=get('prompt');const options=[get('option1'),get('option2'),get('option3'),get('option4')].filter(Boolean);
  const raw=get('correct');const letter=raw.toUpperCase();
  let correct=/^[A-D]$/.test(letter)?letter.charCodeAt(0)-65:-1;
  if(correct<0&&/^\d+$/.test(raw))correct=Number(raw)-1;
  if(correct<0)correct=options.findIndex(v=>v.toLowerCase()===raw.toLowerCase());
  if(!prompt||options.length<2||correct<0||correct>=options.length){problems.push(`${sheetName} row ${i+1}: missing question/options or invalid correct answer.`);continue}
  const identity=prompt.toLowerCase();
  if(seen.has(identity)){problems.push(`${sheetName} row ${i+1}: duplicate question skipped.`);continue}
  seen.add(identity);
  const topic=get('domain')||sheetName;
  const aspSheet=courseId==='asp'?String(topic).match(/domain\s*([1-9])/i):null;
  if(aspSheet&&Number(aspSheet[1])>5){problems.push(`${sheetName} row ${i+1}: ASP has only Domains 1–5; not imported.`);continue}
  const aspMatch=aspSheet;
  const questionDomain=aspMatch?`domain${aspMatch[1]}`:domainId;
  out.push({courseId,domainId:questionDomain,topic,prompt,options,correct,explanation:get('explanation'),reference:`${sourceName} · ${sheetName} · row ${i+1}`});
 }
 return {questions:out,problems};
}
export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted;
  }else if(!quoted&&(ch===','||ch==='\n'||ch==='\r')){
   if(ch===','){row.push(cell);cell=''}else{row.push(cell);rows.push(row);row=[];cell='';if(ch==='\r'&&text[i+1]==='\n')i++}
  }else cell+=ch;
 }
 if(cell||row.length){row.push(cell);rows.push(row)}
 return rows;
}
function unzipEntries(bytes){
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=Math.max(0,bytes.length-65558);
 let eocd=-1;
 for(let p=bytes.length-22;p>=end;p--)if(dv.getUint32(p,true)===0x06054b50){eocd=p;break}
 if(eocd<0)throw Error('Invalid XLSX: ZIP directory not found.');
 const count=dv.getUint16(eocd+10,true),directory=dv.getUint32(eocd+16,true);
 const names=new TextDecoder(),files=new Map();let p=directory;
 for(let i=0;i<count;i++){
  if(dv.getUint32(p,true)!==0x02014b50)throw Error('Invalid XLSX ZIP directory.');
  const method=dv.getUint16(p+10,true),size=dv.getUint32(p+20,true),uncompressed=dv.getUint32(p+24,true);
  if(uncompressed>25*1024*1024)throw Error('Spreadsheet contains an oversized worksheet.');
  const n=dv.getUint16(p+28,true),e=dv.getUint16(p+30,true),c=dv.getUint16(p+32,true),local=dv.getUint32(p+42,true);
  const name=names.decode(bytes.subarray(p+46,p+46+n));
  files.set(name,{method,size,local});p+=46+n+e+c;
 }
 return {files,dv,bytes};
}
async function extract(zip,name){
 const entry=zip.files.get(name);if(!entry)return null;
 const {dv,bytes}=zip,p=entry.local;
 if(dv.getUint32(p,true)!==0x04034b50)throw Error('Damaged XLSX archive.');
 const start=p+30+dv.getUint16(p+26,true)+dv.getUint16(p+28,true);
 const part=bytes.slice(start,start+entry.size);
 if(entry.method===0)return new TextDecoder().decode(part);
 if(entry.method!==8)throw Error('Unsupported XLSX compression.');
 if(!globalThis.DecompressionStream)throw Error('This browser cannot decompress XLSX. Try latest Chrome or import CSV.');
 const stream=new Blob([part]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
 return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}
function xmlDoc(str){const doc=new DOMParser().parseFromString(str,'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid worksheet XML.');return doc;}
function child(node,name){return Array.from(node.children).find(x=>x.localName===name)}
function children(node,name){return Array.from(node?.children||[]).filter(x=>x.localName===name)}
function readSheet(xml,strings){
 const doc=xmlDoc(xml),rows=[];
 for(const row of Array.from(doc.getElementsByTagName('*')).filter(n=>n.localName==='row')){
  const out=[];
  for(const cell of children(row,'c')){
   const address=cell.getAttribute('r')||'A1';const letters=address.match(/^[A-Z]+/)?.[0]||'A';
   let index=0;for(const letter of letters)index=index*26+letter.charCodeAt(0)-64;index--;
   if(index>200)continue;
   const type=cell.getAttribute('t'),val=child(cell,'v')?.textContent??'';
   const inline=child(cell,'is');
   out[index]=type==='s'?strings[Number(val)]||'':type==='inlineStr'?inline?.textContent||'':val;
  }
  rows.push(out);
 }
 return rows;
}
export async function importQuestionFile(file,courseId,domainId){
 if(!file||file.size>12*1024*1024)throw Error('Excel/CSV file must be 12 MB or smaller.');
 let sheets=[];
 if(/\.csv$/i.test(file.name))sheets=[{name:'Questions',rows:parseCSV(await file.text())}];
 else if(/\.xlsx$/i.test(file.name)){
  const zip=unzipEntries(new Uint8Array(await file.arrayBuffer()));
  const shared=await extract(zip,'xl/sharedStrings.xml');let strings=[];
  if(shared){const doc=xmlDoc(shared);strings=Array.from(doc.getElementsByTagName('*')).filter(n=>n.localName==='si').map(n=>n.textContent||'')}
  const paths=Array.from(zip.files.keys()).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/sheet(\d+)/)[1])-Number(b.match(/sheet(\d+)/)[1]));
  if(!paths.length)throw Error('No worksheets found in this Excel file.');
  const workbook=await extract(zip,'xl/workbook.xml');
  let sheetNames=[];
  if(workbook){const doc=xmlDoc(workbook);sheetNames=Array.from(doc.getElementsByTagName('*')).filter(n=>n.localName==='sheet').map(n=>n.getAttribute('name'))}
  for(let i=0;i<paths.length;i++)sheets.push({name:sheetNames[i]||`Sheet ${i+1}`,rows:readSheet(await extract(zip,paths[i]),strings)});
 }else throw Error('Upload .xlsx or .csv. Legacy .xls is not supported; save as .xlsx first.');
 const questions=[],problems=[];
 for(const sheet of sheets){const result=normalizeQuestionRows(sheet.rows,{courseId,domainId,sourceName:file.name,sheetName:sheet.name});questions.push(...result.questions);problems.push(...result.problems)}
 return {questions,problems,sheets:sheets.map(s=>s.name)};
}
