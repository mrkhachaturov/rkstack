#!/usr/bin/env node
//
// consult.mjs — ask Codex to weigh in on a design decision.
//
// Reads the consultation prompt from stdin (the question, Claude's current
// options with rationale, and any relevant context/references). Runs one
// Codex turn through the shared app-server broker with the consult output
// schema enforced. Prints the parsed JSON on stdout.
//
// Used by brainstorming and writing-plans when the user picks "Ask Codex"
// on an AskUserQuestion prompt. Advisory-only: sandbox is always read-only.
//
// Usage:
//   node consult.mjs [--schema <path>] [--cwd <path>] [--effort <level>] [--model <name>]
//
// Flags:
//   --schema  JSON Schema file that Codex's final message must conform to.
//             Defaults to ./consult-schema.json next to this script.
//   --cwd     Working directory for Codex (default: process.cwd()).
//   --effort  none | minimal | low | medium | high | xhigh (default: medium).
//   --model   Optional Codex model override.
//
// Exit codes:
//   0  success — parsed JSON on stdout
//   1  Codex turn failed OR output did not match schema
//   2  usage error (empty stdin, bad flag)
//   3  Codex CLI not installed / lacks required runtime support

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import {
  runAppServerTurn,
  readOutputSchema,
  parseStructuredOutput,
  getCodexAvailability
} from "./lib/codex.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA = path.join(HERE, "consult-schema.json");

function parseArgs(argv) {
  const out = { schema: DEFAULT_SCHEMA, cwd: process.cwd(), effort: "medium", model: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--schema": out.schema = argv[++i]; break;
      case "--cwd": out.cwd = argv[++i]; break;
      case "--effort": out.effort = argv[++i]; break;
      case "--model": out.model = argv[++i]; break;
      case "--help":
      case "-h": out.help = true; break;
      default:
        console.error(`unknown flag: ${a}`);
        process.exit(2);
    }
  }
  return out;
}

function usage() {
  console.error([
    "Usage: consult.mjs [--schema <path>] [--cwd <path>] [--effort <level>] [--model <name>]",
    "",
    "Reads the consultation prompt from stdin. Calls Codex via the shared",
    "app-server broker with the consult output schema enforced. Emits parsed",
    "JSON on stdout."
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { usage(); process.exit(0); }

  const avail = getCodexAvailability(args.cwd);
  if (!avail.available) {
    console.error("error: Codex CLI is not installed or lacks required runtime support.");
    console.error("       Install: `npm install -g @openai/codex`. Then run `!codex login`.");
    process.exit(3);
  }

  const prompt = fs.readFileSync(0, "utf8").trim();
  if (!prompt) {
    console.error("error: no prompt on stdin");
    process.exit(2);
  }

  let outputSchema;
  try {
    outputSchema = readOutputSchema(args.schema);
  } catch (err) {
    console.error(`error: failed to read schema at ${args.schema}: ${err.message}`);
    process.exit(2);
  }

  let result;
  try {
    result = await runAppServerTurn(args.cwd, {
      prompt,
      outputSchema,
      sandbox: "read-only",
      effort: args.effort,
      model: args.model
    });
  } catch (err) {
    console.error(`error: Codex turn failed: ${err.message}`);
    process.exit(1);
  }

  const parsed = parseStructuredOutput(result.finalMessage, {
    status: result.status,
    failureMessage: result.error?.message ?? result.stderr
  });

  if (!parsed.parsed) {
    console.error("error: Codex returned output that did not match the schema.");
    if (parsed.parseError) console.error(`  parseError: ${parsed.parseError}`);
    if (result.stderr) console.error(`  stderr: ${result.stderr}`);
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(parsed.parsed, null, 2) + "\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(`error: ${err.stack || err.message || err}`);
  process.exit(1);
});
