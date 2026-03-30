#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { scanProject } from "./scanner";
import { detectProject } from "./detector";
import { generateReadme } from "./generator";
import {
  printBanner,
  printStep,
  printSuccess,
  printWarning,
  printError,
  printDryRun,
  printSummary,
} from "./formatter";

/** Parsed CLI arguments */
interface CliArgs {
  targetDir: string;
  outputFile: string;
  dryRun: boolean;
  force: boolean;
  help: boolean;
}

function printHelp(): void {
  console.log(`
Usage: readme-gen [directory] [options]

Arguments:
  directory          Target project directory (default: current directory)

Options:
  --output <file>    Output filename (default: README.md)
  --dry-run          Preview without writing file
  --force            Overwrite existing README.md
  --help             Show this help message

Examples:
  readme-gen                          Generate README for current directory
  readme-gen /path/to/project         Generate for specified directory
  readme-gen --output DOCS.md         Custom output filename
  readme-gen --dry-run                Preview without writing
  readme-gen --force                  Overwrite existing README
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    targetDir: process.cwd(),
    outputFile: "README.md",
    dryRun: false,
    force: false,
    help: false,
  };

  const rawArgs = argv.slice(2);
  let i = 0;

  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;

      case "--output":
      case "-o":
        i++;
        if (i >= rawArgs.length) {
          printError("--output requires a filename argument");
          process.exit(1);
        }
        args.outputFile = rawArgs[i];
        break;

      case "--dry-run":
      case "-d":
        args.dryRun = true;
        break;

      case "--force":
      case "-f":
        args.force = true;
        break;

      default:
        if (arg.startsWith("-")) {
          printError(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
        // Positional argument = target directory
        args.targetDir = path.resolve(arg);
        break;
    }

    i++;
  }

  return args;
}

function main(): void {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  printBanner();

  // Step 1: Scan
  printStep("Scanning project directory...");
  let data: ReturnType<typeof scanProject>;
  try {
    data = scanProject(args.targetDir);
  } catch (err: any) {
    printError(err.message);
    process.exit(1);
  }

  if (!data.packageJson) {
    printWarning("No package.json found — generating with limited info");
  }

  // Step 2: Detect
  printStep("Detecting project type and features...");
  const meta = detectProject(data);
  printSummary(meta);

  // Step 3: Generate
  printStep("Generating README...");
  const readme = generateReadme(data, meta);

  // Step 4: Output
  if (args.dryRun) {
    printDryRun(readme);
    printSuccess("Dry run complete — no file written");
    return;
  }

  const outputPath = path.join(args.targetDir, args.outputFile);

  if (fs.existsSync(outputPath) && !args.force) {
    printError(
      `${args.outputFile} already exists. Use --force to overwrite.`
    );
    process.exit(1);
  }

  fs.writeFileSync(outputPath, readme, "utf-8");
  printSuccess(`${args.outputFile} generated at ${outputPath}`);
}

main();
