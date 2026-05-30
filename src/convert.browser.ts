import { encode } from './encoder/index.browser.js';
import { createConvertFns } from './convert.core.js';

const { convert, convertAll, decode, inspect } = createConvertFns(encode);

export { convert, convertAll, decode, inspect };
