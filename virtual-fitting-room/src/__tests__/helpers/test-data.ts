import fs from "fs";
import path from "path";
import os from "os";

let originalDataDir: string;
let tempDir: string;

// We need to monkey-patch the DATA_DIR in db.ts for tests
// Since db.ts uses a module-level constant, we'll override via env var
export function setupTestDataDir() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vfr-test-"));
  process.env.VFR_DATA_DIR = tempDir;
}

export function cleanupTestDataDir() {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  delete process.env.VFR_DATA_DIR;
}

export function getTempDir() {
  return tempDir;
}
