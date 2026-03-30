import * as fs from "fs";
import * as path from "path";

/** Parsed package.json structure */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  bin?: Record<string, string> | string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  keywords?: string[];
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  repository?: string | { type: string; url: string };
  homepage?: string;
  bugs?: string | { url: string };
  engines?: Record<string, string>;
  private?: boolean;
}

/** A node in the directory tree */
export interface TreeNode {
  name: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

/** All scanned project data */
export interface ProjectData {
  rootDir: string;
  packageJson: PackageJson | null;
  tree: TreeNode[];
  files: string[];
  envExample: string[] | null;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasTsConfig: boolean;
  hasGithubWorkflows: boolean;
  hasGitlabCI: boolean;
  gitignorePatterns: string[];
}

const DEFAULT_IGNORES = [
  "node_modules",
  "dist",
  ".git",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

/** Read and parse package.json from a directory */
function readPackageJson(dir: string): PackageJson | null {
  const filePath = path.join(dir, "package.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/** Read .gitignore and return patterns */
function readGitignore(dir: string): string[] {
  const filePath = path.join(dir, ".gitignore");
  if (!fs.existsSync(filePath)) return [];
  try {
    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l && !l.startsWith("#"));
  } catch {
    return [];
  }
}

/** Check if a name should be ignored */
function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  if (DEFAULT_IGNORES.includes(name)) return true;
  for (const pattern of ignorePatterns) {
    const clean = pattern.replace(/^\//, "").replace(/\/$/, "");
    if (name === clean) return true;
    // Simple glob: *.ext
    if (clean.startsWith("*.")) {
      const ext = clean.slice(1);
      if (name.endsWith(ext)) return true;
    }
  }
  return false;
}

/** Recursively build directory tree */
function buildTree(
  dir: string,
  ignorePatterns: string[],
  maxDepth: number,
  currentDepth: number = 0
): TreeNode[] {
  if (currentDepth >= maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: TreeNode[] = [];

  // Sort: directories first, then files, alphabetical within each group
  const sorted = entries
    .filter((e) => !shouldIgnore(e.name, ignorePatterns))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    if (entry.isDirectory()) {
      const children = buildTree(
        path.join(dir, entry.name),
        ignorePatterns,
        maxDepth,
        currentDepth + 1
      );
      nodes.push({ name: entry.name, type: "directory", children });
    } else {
      nodes.push({ name: entry.name, type: "file" });
    }
  }

  return nodes;
}

/** Collect all file paths (relative) */
function collectFiles(
  dir: string,
  ignorePatterns: string[],
  basePath: string = ""
): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    if (shouldIgnore(entry.name, ignorePatterns)) continue;
    const rel = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), ignorePatterns, rel));
    } else {
      files.push(rel);
    }
  }

  return files;
}

/** Read .env.example and return variable names */
function readEnvExample(dir: string): string[] | null {
  const filePath = path.join(dir, ".env.example");
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l && !l.startsWith("#"))
      .map((l: string) => l.split("=")[0].trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

/** Scan a project directory and return all project data */
export function scanProject(dir: string): ProjectData {
  const absDir = path.resolve(dir);

  if (!fs.existsSync(absDir)) {
    throw new Error(`Directory not found: ${absDir}`);
  }

  if (!fs.statSync(absDir).isDirectory()) {
    throw new Error(`Not a directory: ${absDir}`);
  }

  const gitignorePatterns = readGitignore(absDir);
  const packageJson = readPackageJson(absDir);
  const tree = buildTree(absDir, gitignorePatterns, 4);
  const files = collectFiles(absDir, gitignorePatterns);
  const envExample = readEnvExample(absDir);

  const fileExists = (name: string) => fs.existsSync(path.join(absDir, name));

  return {
    rootDir: absDir,
    packageJson,
    tree,
    files,
    envExample,
    hasDockerfile: fileExists("Dockerfile"),
    hasDockerCompose:
      fileExists("docker-compose.yml") || fileExists("docker-compose.yaml"),
    hasTsConfig: fileExists("tsconfig.json"),
    hasGithubWorkflows: fs.existsSync(path.join(absDir, ".github", "workflows")),
    hasGitlabCI: fileExists(".gitlab-ci.yml"),
    gitignorePatterns,
  };
}
