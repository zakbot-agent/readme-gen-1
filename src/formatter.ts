/** CLI output formatting utilities */

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function printBanner(): void {
  console.log(`${BOLD}${CYAN}`);
  console.log("  readme-gen");
  console.log(`${DIM}  Auto-generate beautiful README.md files${RESET}`);
  console.log();
}

export function printStep(message: string): void {
  console.log(`${CYAN}>${RESET} ${message}`);
}

export function printSuccess(message: string): void {
  console.log(`${GREEN}\u2713${RESET} ${message}`);
}

export function printWarning(message: string): void {
  console.log(`${YELLOW}!${RESET} ${message}`);
}

export function printError(message: string): void {
  console.error(`${RED}\u2717${RESET} ${message}`);
}

export function printInfo(label: string, value: string): void {
  console.log(`  ${DIM}${label}:${RESET} ${value}`);
}

export function printDryRun(content: string): void {
  console.log();
  console.log(`${YELLOW}--- DRY RUN (preview) ---${RESET}`);
  console.log();
  console.log(content);
  console.log(`${YELLOW}--- END DRY RUN ---${RESET}`);
}

export function printSummary(meta: {
  name: string;
  version: string;
  framework: { name: string } | null;
  isTypeScript: boolean;
  features: string[];
  techStack: { name: string }[];
}): void {
  console.log();
  console.log(`${BOLD}Project Summary${RESET}`);
  printInfo("Name", meta.name);
  printInfo("Version", meta.version);
  printInfo("Language", meta.isTypeScript ? "TypeScript" : "JavaScript");
  if (meta.framework) {
    printInfo("Framework", meta.framework.name);
  }
  if (meta.techStack.length > 0) {
    printInfo("Tech", meta.techStack.map((t) => t.name).join(", "));
  }
  if (meta.features.length > 0) {
    printInfo("Features", meta.features.join(", "));
  }
  console.log();
}
