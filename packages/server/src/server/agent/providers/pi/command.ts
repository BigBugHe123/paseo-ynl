import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type PiCommand = [string, ...string[]];

let cachedCommand: Promise<PiCommand> | undefined;

export function resolvePiCommand(): Promise<PiCommand> {
  cachedCommand ??= resolvePiCommandUncached();
  return cachedCommand;
}

async function resolvePiCommandUncached(): Promise<PiCommand> {
  const overrideCommand = process.env.PI_COMMAND ?? process.env.PI_ACP_PI_COMMAND;
  if (overrideCommand) {
    return [overrideCommand];
  }

  const piRustRoot = await findPiRustWorkspace();
  if (piRustRoot) {
    const binaryName = process.platform === "win32" ? "pi.exe" : "pi";
    for (const profile of ["debug", "release"]) {
      const binaryPath = join(piRustRoot, "target", profile, binaryName);
      if (await fileExists(binaryPath)) {
        return [binaryPath];
      }
    }

    return [
      "cargo",
      `+${process.env.PASEO_PI_RUST_TOOLCHAIN ?? "1.98.1"}`,
      "run",
      "--quiet",
      "--manifest-path",
      join(piRustRoot, "Cargo.toml"),
      "--package",
      "pi-coding-agent",
      "--bin",
      "pi",
      "--",
    ];
  }

  return ["pi"];
}

async function findPiRustWorkspace(): Promise<string | null> {
  const starts = [dirname(fileURLToPath(import.meta.url)), process.cwd()];
  for (const start of starts) {
    let directory = resolve(start);
    while (true) {
      const candidate = join(directory, "pi-rust-ynl");
      if (await fileExists(join(candidate, "Cargo.toml"))) {
        return candidate;
      }

      const parent = dirname(directory);
      if (parent === directory) {
        break;
      }
      directory = parent;
    }
  }

  return null;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
