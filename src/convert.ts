import { encode } from './encoder/index.js';
import { decodeHeif } from './decoder/heif-decoder.js';
import { createConvertFns } from './convert.core.js';

const { convert, convertAll, decode, inspect } = createConvertFns(encode, decodeHeif);

export { convert, convertAll, decode, inspect };
