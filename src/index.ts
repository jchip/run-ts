import { addHook } from "pirates";
import Path from "path";
import Fs from "fs";
import { Options as TransformOptions, transform } from "sucrase";

import { walkUpDir } from "./utils";

const transformsInfo = {
  ".ts": ["typescript", "imports"],
  ".tsx": ["typescript", "imports", "jsx"],
};

/**
 * Run TS implementation
 */
class RunTs {
  _revert: () => void;
  _packageJsonMap: Record<string, any>;

  constructor() {
    this._packageJsonMap = {};
  }

  /**
   * Search up from a directory for package.json
   *
   * @param filename
   * @returns
   */
  private searchPackageJson(filename: string): string | undefined {
    const dir = Path.dirname(filename);
    let found = walkUpDir(dir, (d2) => this._packageJsonMap[d2]);

    if (found === undefined) {
      found = walkUpDir(dir, (d2) => {
        const file = Path.join(dir, "package.json");
        if (Fs.existsSync(file)) {
          this._packageJsonMap[d2] = true;
          return file;
        }
        return undefined;
      });
    }

    return found;
  }

  /**
   * Revert the require hook
   */
  revert() {
    if (this._revert) {
      this._revert();
    }
  }

  /**
   * determine if a require file should be processed
   * @param _filename
   * @returns
   */
  matcher(_filename: string) {
    return true;
  }

  /**
   * extract the source files from source maps data
   *
   * @param filename
   * @param mapInfo
   * @returns
   */
  getSourceFilesFromMap(filename: string, mapInfo: string): string[] {
    const srcDir = Path.dirname(filename);

    let mapData: any;

    if (mapInfo.includes("data:application/json")) {
      const base64Map = mapInfo.split(",")[1];
      mapData = JSON.parse(Buffer.from(base64Map).toString("base64"));
    } else {
      const fullMapFile = Path.join(srcDir, mapInfo);
      mapData = JSON.parse(Fs.readFileSync(fullMapFile, "utf-8"));
    }

    const { sourceRoot = "" } = mapData;
    const sourceFiles = mapData.sources.map((s: string): string => {
      const srcFile = sourceRoot + s;
      const src2 = Path.isAbsolute(srcFile) ? srcFile : Path.join(srcDir, srcFile);
      return src2;
    });

    return sourceFiles;
  }

  /**
   * Compile a typescript source file with sucrase
   *
   * @param filePath - file to compile
   * @param compiledFilename
   * @param withSourceMap
   * @returns
   */
  private sucraseCompileTS(
    filePath: string,
    compiledFilename: string,
    withSourceMap = true
  ): string {
    const source = Fs.readFileSync(filePath, "utf-8");
    const options: TransformOptions = {
      transforms: transformsInfo[Path.extname(filePath)],
      filePath,
    };

    if (withSourceMap) {
      options.sourceMapOptions = {
        compiledFilename,
      };
    }

    const { code, sourceMap } = transform(source, options);

    let suffix = "";
    if (withSourceMap) {
      const base64Map = Buffer.from(JSON.stringify(sourceMap)).toString("base64");
      suffix = `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
    }

    return `${code}${suffix}`;
  }

  /**
   * Process a .js file being required
   *
   * @param code
   * @param filename
   * @returns
   */
  private processJsFile(code: string, filename: string): string {
    const match = code.match(/^\/\/# sourceMappingURL=(.+$)/m);
    if (match) {
      const sourceFiles = this.getSourceFilesFromMap(filename, match[1]);
      const compiledCode = sourceFiles
        .map((filePath: string): string => {
          return this.sucraseCompileTS(filePath, filename);
        })
        .join("\n");

      return compiledCode;
    }

    return code;
  }

  /**
   * Install required hook
   */
  installRequireHook() {
    this._revert = addHook(
      (code, filename) => {
        const ext = Path.extname(filename);
        if (ext === ".js") {
          return this.processJsFile(code, filename);
        }
        return code;
      },
      { exts: [".js", ".jsx", ".ts", ".tsx"], matcher: (filename) => this.matcher(filename) }
    );
  }
}

const runTs = new RunTs();
runTs.installRequireHook();
