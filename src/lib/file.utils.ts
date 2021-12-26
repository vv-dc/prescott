import { lstatSync, readdirSync } from 'fs';
import { join } from 'path';

export const getDirectoryFilesSync = (directory: string): string[] => {
  const files = [] as string[];

  for (const file of readdirSync(directory)) {
    const filePath = join(directory, file);
    const filePaths = lstatSync(filePath).isDirectory()
      ? getDirectoryFilesSync(filePath)
      : [filePath];
    files.push(...filePaths);
  }

  return files;
};
