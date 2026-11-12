import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldFocusShield,shouldBlackoutForBlur,shouldBlackoutForVisibility,isPotentialCaptureShortcut} from '../src/lib/contentProtection.js';
import {shouldShieldMediaOnBlur,isGuardedMediaShortcut} from '../src/lib/lessonMediaFullscreen.js';
const read=p=>readFileSync(p,'utf8');
const explorer=read('src/production/CourseLessonExplorer.jsx'),legacy=read('src/production/LiveLearning.jsx'),
 surface=read('src/production/LiveProtectedContent.jsx'),player=read('src/production/ProtectedLessonViewer.jsx'),
 css=read('src/contentProtection.css'),api=read('src/production/lessonMediaApi.js');
assert.equal(shouldFocusShield('lesson-surface'),true);
assert.equal(shouldFocusShield('mock-exam-surface'),true);
assert.equal(shouldBlackoutForBlur('mock-exam-surface',false),true);
assert.equal(shouldBlackoutForVisibility('mock-exam-surface','hidden'),true);
assert.equal(shouldBlackoutForBlur('lesson-surface',false),true);
assert.equal(shouldBlackoutForBlur('lesson-surface',true),false,'Mobile keyboard must not black out reading');
assert.equal(shouldBlackoutForVisibility('lesson-surface','hidden'),true);
assert.equal(shouldBlackoutForVisibility('lesson-surface','visible'),false);
assert.equal(shouldFocusShield('lesson-video'),false,'Individual media retain their own viewer focus policy');
assert.equal(shouldFocusShield('lesson-material'),false);
assert.equal(shouldShieldMediaOnBlur({mobile:false,activeTag:'iframe',visibility:'visible'}),false);
for(const event of [{key:'PrintScreen'},{key:'s',metaKey:true,shiftKey:true},{key:'4',metaKey:true,shiftKey:true}])
 assert(isPotentialCaptureShortcut(event)&&isGuardedMediaShortcut(event));
for(const [file,needle] of [[explorer,'kind="lesson-surface"'],[legacy,'kind="lesson-surface"'],
 [surface,'createPortal(shield,document.body)'],[surface,'Resume lesson'],
 [surface,'onClick={resumeLesson}'],[surface,"document.activeElement?.tagName"],
 [surface,"window.addEventListener('keyup',onCaptureKey,true)"],
 [player,"window.addEventListener('keyup',onShortcut,true)"],
 [player,"!['capture-shortcut','fullscreen-exit'].includes(shieldReason.current)"],
 [player,"pdf.current.src='about:blank'"],
 [player,"video.current.pause();video.current.removeAttribute('src');video.current.load()"],
 [css,'.tc-capture-curtain.tc-lesson-curtain:not([hidden])'],
 [css,'pointer-events:auto!important'],[css,'html.tc-has-protected-content #root'],
 [api,"action:'view'"]])assert(file.includes(needle),'P67 missing '+needle);
assert(explorer.indexOf('ref={videoSectionRef}')>explorer.indexOf('kind="lesson-surface"'));
assert(explorer.indexOf('ref={materialSectionRef}')>explorer.indexOf('kind="lesson-surface"'));
assert(explorer.indexOf('ref={quizSectionRef}')>explorer.indexOf('kind="lesson-surface"'));
assert(explorer.includes("<ProtectedLessonViewer db={db}"));
assert(explorer.includes('onWatched={()='));
assert(player.includes('fraction>=.9'));
assert(!api.includes('.getPublicUrl('));
console.log('P67 browser privacy, black curtain, PDF/video and lesson-wide capture deterrence PASS');
console.log('LIMITATION: OS-native screenshots and recording cannot be universally blocked by browser JavaScript.');

assert.match(surface,/window\.dispatchEvent\(new CustomEvent\('technica:lesson-resume'/);
assert.match(player,/window\.addEventListener\('technica:lesson-resume',onLessonResume\)/);
assert.match(player,/e\.detail\?\.lessonId===lessonId/);
assert.match(explorer,/lessonId=\{selected\.id\} identity=/);
assert.match(legacy,/lessonId=\{lesson\.id\} identity=/);
