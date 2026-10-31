/**
 * TI-style ENTER finalizes a well-formed expression by closing pending
 * parentheses, without suppressing genuine syntax or template errors.
 * This is a UI-enter operation, not a replacement for strict source parsing.
 */
export function finishCalculatorEntry(expression){
 const raw=String(expression||'');
 let balance=0;
 for(const ch of raw){
  if(ch==='(')balance++;
  if(ch===')'){balance--;if(balance<0)throw Error('Unexpected closing parenthesis')}
  if(balance>23)throw Error('Too many pending parentheses (23 maximum)');
 }
 return raw+')'.repeat(balance);
}
