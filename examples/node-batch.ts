import { convert, isHeic } from 'heic-anyconv';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

async function main() {
  const dir = process.argv[2] || '.';
  const format = (process.argv[3] || 'jpeg') as 'jpeg' | 'png' | 'webp';

  const files = await readdir(dir);
  const heicFiles = files.filter((f) => /\.heic$/i.test(f));

  if (heicFiles.length === 0) {
    console.log('No HEIC files found in', dir);
    return;
  }

  console.log(`Converting ${heicFiles.length} files to ${format}...`);

  for (const file of heicFiles) {
    const data = await readFile(join(dir, file));

    if (!isHeic(data)) {
      console.log(`  Skipping ${file} (not valid HEIC)`);
      continue;
    }

    const result = await convert({ data, format, quality: 0.9 });
    const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
    const output = join(dir, basename(file, extname(file)) + ext);
    await writeFile(output, result.data);
    console.log(`  ${file} -> ${basename(output)} (${result.width}x${result.height})`);
  }

  console.log('Done!');
}

main();
