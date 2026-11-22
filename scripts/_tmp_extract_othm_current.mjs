// Temporary one-off importer for official public 2026 OTHM specification via CI network.
// This diagnostic is removed before merge.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const url='https://othm.org.uk/docs/qualifications/othm-level-6-diploma-in-occupational-health-and-safety7565/specification_files/othm_level_6_diploma_in_occupational_health_and_safety_specification_nov_2026_master_2026-11-04_08-59.pdf';
try {
 const dir=mkdtempSync(join(tmpdir(),'othm-2026-'));
 const pdf=join(dir,'spec.pdf');
 execFileSync('curl',['-fsSL','--max-time','35','--retry','2','-A','Mozilla/5.0','-o',pdf,url],{timeout:60000});
 let extracted;
 try {
   extracted=execFileSync('pdftotext',['-raw','-nopgbrk','-enc','UTF-8',pdf,'-'],{encoding:'utf8',maxBuffer:5*1024*1024});
 } catch {
   const venv=join(dir,'venv');
   execFileSync('python3',['-m','venv',venv],{timeout:60000});
   execFileSync(join(venv,'bin','pip'),['install','-q','pypdf'],{timeout:90000,stdio:'pipe'});
   const py="from pypdf import PdfReader; import sys; r=PdfReader(sys.argv[1]); print('\\n'.join((p.extract_text() or '') for p in r.pages))";
   extracted=execFileSync(join(venv,'bin','python'),['-c',py,pdf],{encoding:'utf8',maxBuffer:5*1024*1024,timeout:90000});
 }
 console.log('OTHM_2026_EXTRACT_BEGIN');
 console.log(Buffer.from(extracted,'utf8').toString('base64').match(/.{1,350}/g).join('\n'));
 console.log('OTHM_2026_EXTRACT_END');
 console.log('OTHM 2026 extracted characters:',extracted.length);
} catch(error) {
 console.log('OTHM_2026_EXTRACT_FAILED:',String(error?.message||error).slice(0,700));
}
