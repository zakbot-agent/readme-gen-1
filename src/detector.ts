import * as path from "path";
import type { ProjectData, PackageJson } from "./scanner";

/** Detected project metadata */
export interface ProjectMeta {
  name: string;
  version: string;
  description: string;
  license: string;
  author: string;
  repositoryUrl: string;
  homepage: string;
  bugsUrl: string;
  nodeVersion: string;
  isTypeScript: boolean;
  framework: FrameworkInfo | null;
  testFramework: TestFrameworkInfo | null;
  features: string[];
  techStack: TechEntry[];
  cliEntries: CliEntry[];
  hasCI: string | null;
  hasDocker: boolean;
}

export interface FrameworkInfo {
  name: string;
  version: string;
}

export interface TestFrameworkInfo {
  name: string;
  command: string;
}

export interface TechEntry {
  name: string;
  version: string;
  category: "framework" | "runtime" | "library" | "tool" | "testing";
}

export interface CliEntry {
  command: string;
  path: string;
}

/** Known framework detection rules: [depName, displayName] */
const FRAMEWORK_RULES: [string, string][] = [
  ["next", "Next.js"],
  ["nuxt", "Nuxt.js"],
  ["@nestjs/core", "Nest.js"],
  ["fastify", "Fastify"],
  ["express", "Express"],
  ["hono", "Hono"],
  ["koa", "Koa"],
  ["react", "React"],
  ["vue", "Vue.js"],
  ["svelte", "Svelte"],
  ["@angular/core", "Angular"],
  ["astro", "Astro"],
  ["gatsby", "Gatsby"],
  ["remix", "Remix"],
  ["electron", "Electron"],
];

const TEST_RULES: [string, string, string][] = [
  ["vitest", "Vitest", "vitest"],
  ["jest", "Jest", "jest"],
  ["mocha", "Mocha", "mocha"],
  ["ava", "AVA", "ava"],
  ["tap", "TAP", "tap"],
];

/** Merge all deps from package.json */
function getAllDeps(pkg: PackageJson): Record<string, string> {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };
}

/** Clean semver version string */
function cleanVersion(v: string): string {
  return v.replace(/^[\^~>=<]*/g, "").trim();
}

/** Extract author string */
function extractAuthor(pkg: PackageJson): string {
  if (!pkg.author) return "";
  if (typeof pkg.author === "string") return pkg.author;
  return pkg.author.name ?? "";
}

/** Extract repository URL */
function extractRepoUrl(pkg: PackageJson): string {
  if (!pkg.repository) return "";
  if (typeof pkg.repository === "string") return pkg.repository;
  return pkg.repository.url?.replace(/^git\+/, "").replace(/\.git$/, "") ?? "";
}

/** Extract bugs URL */
function extractBugsUrl(pkg: PackageJson): string {
  if (!pkg.bugs) return "";
  if (typeof pkg.bugs === "string") return pkg.bugs;
  return pkg.bugs.url ?? "";
}

/** Detect the primary framework */
function detectFramework(allDeps: Record<string, string>): FrameworkInfo | null {
  for (const [depName, displayName] of FRAMEWORK_RULES) {
    if (depName in allDeps) {
      return { name: displayName, version: cleanVersion(allDeps[depName]) };
    }
  }
  return null;
}

/** Detect the test framework */
function detectTestFramework(
  allDeps: Record<string, string>,
  scripts: Record<string, string>
): TestFrameworkInfo | null {
  for (const [depName, displayName, cmd] of TEST_RULES) {
    if (depName in allDeps) {
      // Try to find the test script
      const testCmd = scripts["test"] ?? cmd;
      return { name: displayName, command: testCmd };
    }
  }
  // Check scripts for test command even without dep
  if (scripts["test"] && scripts["test"] !== 'echo "Error: no test specified" && exit 1') {
    return { name: "Custom", command: scripts["test"] };
  }
  return null;
}

/** Build tech stack list */
function buildTechStack(
  allDeps: Record<string, string>,
  data: ProjectData
): TechEntry[] {
  const stack: TechEntry[] = [];

  if (data.hasTsConfig) {
    const tsVer = allDeps["typescript"] ?? "";
    stack.push({
      name: "TypeScript",
      version: cleanVersion(tsVer),
      category: "runtime",
    });
  }

  const notableLibs: [string, string, TechEntry["category"]][] = [
    ["next", "Next.js", "framework"],
    ["nuxt", "Nuxt.js", "framework"],
    ["@nestjs/core", "Nest.js", "framework"],
    ["express", "Express", "framework"],
    ["fastify", "Fastify", "framework"],
    ["hono", "Hono", "framework"],
    ["koa", "Koa", "framework"],
    ["react", "React", "library"],
    ["vue", "Vue.js", "library"],
    ["svelte", "Svelte", "library"],
    ["@angular/core", "Angular", "framework"],
    ["tailwindcss", "Tailwind CSS", "tool"],
    ["prisma", "Prisma", "library"],
    ["drizzle-orm", "Drizzle ORM", "library"],
    ["typeorm", "TypeORM", "library"],
    ["mongoose", "Mongoose", "library"],
    ["socket.io", "Socket.IO", "library"],
    ["graphql", "GraphQL", "library"],
    ["zod", "Zod", "library"],
    ["eslint", "ESLint", "tool"],
    ["prettier", "Prettier", "tool"],
    ["jest", "Jest", "testing"],
    ["vitest", "Vitest", "testing"],
    ["mocha", "Mocha", "testing"],
    ["webpack", "Webpack", "tool"],
    ["vite", "Vite", "tool"],
    ["esbuild", "esbuild", "tool"],
    ["rollup", "Rollup", "tool"],
    ["docker", "Docker", "tool"],
  ];

  for (const [dep, name, category] of notableLibs) {
    if (dep in allDeps) {
      // Avoid duplicates
      if (!stack.some((s) => s.name === name)) {
        stack.push({ name, version: cleanVersion(allDeps[dep]), category });
      }
    }
  }

  if (data.hasDockerfile && !stack.some((s) => s.name === "Docker")) {
    stack.push({ name: "Docker", version: "", category: "tool" });
  }

  return stack;
}

/** Detect features based on project data */
function detectFeatures(data: ProjectData, allDeps: Record<string, string>): string[] {
  const features: string[] = [];
  const pkg = data.packageJson;

  if (pkg?.bin) features.push("CLI tool");
  if (data.hasTsConfig) features.push("TypeScript support");
  if (data.hasDockerfile) features.push("Docker ready");
  if (data.hasGithubWorkflows) features.push("GitHub Actions CI/CD");
  if (data.hasGitlabCI) features.push("GitLab CI/CD");
  if (data.envExample) features.push("Environment configuration");

  if ("express" in allDeps || "fastify" in allDeps || "hono" in allDeps || "koa" in allDeps) {
    features.push("REST API");
  }
  if ("graphql" in allDeps) features.push("GraphQL API");
  if ("socket.io" in allDeps) features.push("WebSocket support");
  if ("prisma" in allDeps || "drizzle-orm" in allDeps || "typeorm" in allDeps || "mongoose" in allDeps) {
    features.push("Database ORM");
  }
  if ("zod" in allDeps || "joi" in allDeps || "yup" in allDeps) {
    features.push("Schema validation");
  }
  if ("jsonwebtoken" in allDeps || "passport" in allDeps) {
    features.push("Authentication");
  }

  return features;
}

/** Extract CLI entries from bin field */
function extractCliEntries(pkg: PackageJson): CliEntry[] {
  if (!pkg.bin) return [];
  if (typeof pkg.bin === "string") {
    return [{ command: pkg.name ?? "cli", path: pkg.bin }];
  }
  return Object.entries(pkg.bin).map(([cmd, p]) => ({ command: cmd, path: p }));
}

/** Detect CI type */
function detectCI(data: ProjectData): string | null {
  if (data.hasGithubWorkflows) return "GitHub Actions";
  if (data.hasGitlabCI) return "GitLab CI";
  return null;
}

/** Main detection function: analyze project data and return metadata */
export function detectProject(data: ProjectData): ProjectMeta {
  const pkg = data.packageJson ?? {};
  const allDeps = getAllDeps(pkg);
  const scripts = pkg.scripts ?? {};

  return {
    name: pkg.name ?? path.basename(data.rootDir),
    version: pkg.version ?? "0.0.0",
    description: pkg.description ?? "",
    license: pkg.license ?? "",
    author: extractAuthor(pkg),
    repositoryUrl: extractRepoUrl(pkg),
    homepage: pkg.homepage ?? "",
    bugsUrl: extractBugsUrl(pkg),
    nodeVersion: pkg.engines?.["node"] ?? "",
    isTypeScript: data.hasTsConfig,
    framework: detectFramework(allDeps),
    testFramework: detectTestFramework(allDeps, scripts),
    features: detectFeatures(data, allDeps),
    techStack: buildTechStack(allDeps, data),
    cliEntries: extractCliEntries(pkg),
    hasCI: detectCI(data),
    hasDocker: data.hasDockerfile || data.hasDockerCompose,
  };
}

