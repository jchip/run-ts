import Path from "path";
import Fs from "fs";
/**
 * walk up a path of directories
 *
 * @param dir
 * @param walkCb
 * @param stopDirs
 * @returns
 */
export function walkUpDir<T = string>(
  path: string,
  walkCb: (dir: string) => T | undefined,
  stopDirs: string[] = []
): T | undefined {
  let count = 0;
  let dir: string;
  let next = path;
  let name;
  do {
    dir = next;
    const x = walkCb(dir);
    if (x !== undefined) {
      return x;
    }
    name = Path.basename(dir);
    next = Path.dirname(dir);
  } while (dir !== next && ++count < 100 && !stopDirs.includes(name));

  return undefined;
}

const _CACHE = {};

/**
 * search up a path of directories looking for package.json
 *
 * @param path
 * @param cache
 * @returns
 */
export function searchUpFile(
  path: string,
  file: string,
  cache: Record<string, string>,
  stopDirs: string[] = []
): string {
  let found = cache && walkUpDir(path, (d2) => cache[d2], stopDirs);

  if (!found) {
    found = walkUpDir(
      path,
      (d2) => {
        const file = Path.join(d2, file);
        if (Fs.existsSync(file)) {
          if (cache) {
            cache[d2] = file;
          }
          return file;
        }
        return undefined;
      },
      stopDirs
    );
  }

  return found;
}
