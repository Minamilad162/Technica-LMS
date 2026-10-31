import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
// Pure layout data is asserted via source because Node does not natively compile JSX.
// Actual runtime button order, click behavior and no-scroll geometry are audited by Playwright.
const files={
 component:readFileSync(new URL('../src/components/CalculatorPhysicalKeypad.jsx',import.meta.url),'utf8'),
 parent:readFileSync(new URL('../src/components/ScientificCalculator.jsx',import.meta.url),'utf8'),
 editor:readFileSync(new URL('../src/components/MathTemplateEditor.jsx',import.meta.url),'utf8'),
 styles:readFileSync(new URL('../src/calculatorPhysical.css',import.meta.url),'utf8'),
 main:readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8'),
 browser:readFileSync(new URL('./test-calculator-browser.mjs',import.meta.url),'utf8'),
 blueprint:readFileSync(new URL('../TECHNICA_LMS_MASTER_BLUEPRINT.md',import.meta.url),'utf8')
};
assert.match(files.parent,/CalculatorPhysicalKeypad second=\{second\}/);
assert.match(files.parent,/if\(key==='prb'\)/);
assert.match(files.parent,/if\(key==='data'\)/);
assert.match(files.parent,/if\(key==='table'\)/);
assert.match(files.parent,/if\(key==='mode'\)/);
assert.match(files.parent,/tc-calc-menu-panel/);
assert.match(files.parent,/MathTemplateEditor/);
assert.match(files.parent,/MATH_TEMPLATES/);
assert.match(files.parent,/data-math-template=\{kind\}/);
assert.match(files.parent,/mathEditor.current\?\.removeTemplate/);
assert.doesNotMatch(files.editor,/className="tc-math-template-tools"/,'Math template toolbar must not be mounted inside the LCD');
assert.match(files.parent,/tc-calc-template-menu/);
assert.match(files.styles,/unified molded-blue 3D casing/);
assert.match(files.styles,/#294b63/);

assert.match(files.component,/data-calc-key=\{item.key\}/);
assert.match(files.component,/tc-calc-direction-pad/);
assert.match(files.styles,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
assert.match(files.styles,/grid-template-rows:repeat\(7,var\(--tc-key-h\)\)/);
assert.match(files.styles,/tc-calc-menu-panel/);
assert.match(files.main,/calculatorPhysical\.css/);
assert.match(files.browser,/physical keypad/);
assert.match(files.blueprint,/TI-30XS|TI.?30XS/);
console.log('PASS photo-referenced calculator physical layout, menu wiring, 5-column fixed keypad, nested math input and browser audit integration.');
