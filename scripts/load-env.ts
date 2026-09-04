import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function stripOptionalQuotes(value: string) {
  const quote = value[0];

  if (
    (quote === `"` || quote === `'`) &&
    value[value.length - 1] === quote
  ) {
    const unquoted = value.slice(1, -1);

    return quote === `"`
      ? unquoted.replace(/\\n/g, "\n").replace(/\\r/g, "\r")
      : unquoted;
  }

  return value;
}

export function loadDotEnvOnly() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) return false;

  const source = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);

    if (!match) continue;

    const [, key, rawValue] = match;

    if (process.env[key] !== undefined) continue;

    process.env[key] = stripOptionalQuotes(rawValue.trim());
  }

  return true;
}

loadDotEnvOnly();
