import { convert, isHeic } from 'heic-anyconv';
import { readFile, writeFile } from 'node:fs/promises';

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npx tsx examples/node-basic.ts <input.heic>');
    process.exit(1);
  }

  const data = await readFile(input);

  if (!isHeic(data)) {
    console.error('Not a HEIC file');
    process.exit(1);
  }

  const result = await convert({
    data,
    format: 'jpeg',
    quality: 0.9,
  });

  const output = input.replace(/\.heic$/i, '.jpg');
  await writeFile(output, result.data);
  console.log(`Converted ${result.width}x${result.height} -> ${output} (${result.data.length} bytes)`);
}

main();
