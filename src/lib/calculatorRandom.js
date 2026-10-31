/**
 * Local deterministic pseudo-random source for repeatable calculator sessions.
 * Deliberately NOT claiming parity with TI firmware PRNG/seed sequence.
 * Seed mode is useful for regression and exam practice. For security-sensitive
 * randomness, Math.random and this generator are NOT cryptographic.
 */
export function seededCalculatorRandom(seed){
 if(!Number.isSafeInteger(seed)||seed<0)throw Error('Random seed must be a non-negative integer');
 let state=(seed>>>0)||0x6d2b79f5;
 return function next(){
  state=(Math.imul(1664525,state)+1013904223)>>>0;
  return state/4294967296;
 };
}
