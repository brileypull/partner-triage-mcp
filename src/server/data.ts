import { readFile, writeFile } from 'node:fs/promises';

// The repo's root folder, two levels up from this file.
const ROOT = new URL('../../', import.meta.url);

// Some Windows tools put an invisible marker (a byte order mark) at the start
// of a file. JSON.parse rejects it, so remove it before reading.
function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '');
}

export async function loadJson<T>(path: string): Promise<T> {
  const text = await readFile(new URL(path, ROOT), 'utf8');
  return JSON.parse(stripBom(text)) as T;
}

export async function saveJson(path: string, value: unknown): Promise<void> {
  await writeFile(new URL(path, ROOT), JSON.stringify(value, null, 2) + '\n');
}

export async function loadText(path: string): Promise<string> {
  return stripBom(await readFile(new URL(path, ROOT), 'utf8'));
}