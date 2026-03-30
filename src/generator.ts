import type { ProjectData, TreeNode } from "./scanner";
import type { ProjectMeta } from "./detector";

/** Generate complete README markdown */
export function generateReadme(data: ProjectData, meta: ProjectMeta): string {
  const sections: string[] = [
    generateTitle(meta),
    generateBadges(meta),
    generateDescription(meta),
    generateFeatures(meta),
    generateTechStack(meta),
    generatePrerequisites(meta),
    generateInstallation(meta, data),
    generateUsage(meta, data),
    generateProjectStructure(data),
    generateEnvVars(data),
    generateApiReference(meta),
    generateTesting(meta, data),
    generateDocker(meta, data),
    generateLicense(meta),
    generateAuthor(meta),
  ];

  return sections.filter(Boolean).join("\n\n") + "\n";
}

function generateTitle(meta: ProjectMeta): string {
  return `# ${meta.name}`;
}

function generateBadges(meta: ProjectMeta): string {
  const badges: string[] = [];

  if (meta.version && meta.version !== "0.0.0") {
    badges.push(
      `![Version](https://img.shields.io/badge/version-${encodeURIComponent(meta.version)}-blue.svg)`
    );
  }

  if (meta.license) {
    badges.push(
      `![License](https://img.shields.io/badge/license-${encodeURIComponent(meta.license)}-green.svg)`
    );
  }

  if (meta.nodeVersion) {
    badges.push(
      `![Node](https://img.shields.io/badge/node-${encodeURIComponent(meta.nodeVersion)}-brightgreen.svg)`
    );
  }

  if (meta.isTypeScript) {
    badges.push(
      `![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)`
    );
  }

  return badges.length > 0 ? badges.join(" ") : "";
}

function generateDescription(meta: ProjectMeta): string {
  if (!meta.description) return "";
  return `> ${meta.description}`;
}

function generateFeatures(meta: ProjectMeta): string {
  if (meta.features.length === 0) return "";
  const items = meta.features.map((f) => `- ${f}`).join("\n");
  return `## Features\n\n${items}`;
}

function generateTechStack(meta: ProjectMeta): string {
  if (meta.techStack.length === 0) return "";

  const grouped: Record<string, typeof meta.techStack> = {};
  for (const entry of meta.techStack) {
    const cat = entry.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(entry);
  }

  const categoryLabels: Record<string, string> = {
    framework: "Frameworks",
    runtime: "Runtime",
    library: "Libraries",
    tool: "Tools",
    testing: "Testing",
  };

  const lines: string[] = ["## Tech Stack", ""];

  for (const [cat, entries] of Object.entries(grouped)) {
    const label = categoryLabels[cat] ?? cat;
    lines.push(`**${label}:**`);
    for (const entry of entries) {
      const ver = entry.version ? ` v${entry.version}` : "";
      lines.push(`- ${entry.name}${ver}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function generatePrerequisites(meta: ProjectMeta): string {
  const items: string[] = [];

  if (meta.nodeVersion) {
    items.push(`- Node.js ${meta.nodeVersion}`);
  } else {
    items.push("- Node.js >= 18.0.0");
  }

  items.push("- npm or yarn");

  return `## Prerequisites\n\n${items.join("\n")}`;
}

function generateInstallation(meta: ProjectMeta, data: ProjectData): string {
  const lines: string[] = ["## Installation", ""];

  // If it has a repo, show git clone
  if (meta.repositoryUrl) {
    lines.push("```bash");
    lines.push(`git clone ${meta.repositoryUrl}`);
    lines.push(`cd ${meta.name}`);
    lines.push("npm install");
    lines.push("```");
  } else {
    lines.push("```bash");
    lines.push(`cd ${meta.name}`);
    lines.push("npm install");
    lines.push("```");
  }

  // Global install for CLI tools
  if (meta.cliEntries.length > 0) {
    lines.push("");
    lines.push("Or install globally:");
    lines.push("");
    lines.push("```bash");
    lines.push(`npm install -g ${meta.name}`);
    lines.push("```");
  }

  return lines.join("\n");
}

function generateUsage(meta: ProjectMeta, data: ProjectData): string {
  const lines: string[] = ["## Usage", ""];
  const pkg = data.packageJson;

  // CLI usage
  if (meta.cliEntries.length > 0) {
    lines.push("### CLI", "");
    lines.push("```bash");
    for (const entry of meta.cliEntries) {
      lines.push(`${entry.command}`);
    }
    lines.push("```");
    lines.push("");
  }

  // Available scripts
  if (pkg?.scripts && Object.keys(pkg.scripts).length > 0) {
    lines.push("### Available Scripts", "");
    lines.push("| Script | Command |");
    lines.push("|--------|---------|");
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      lines.push(`| \`npm run ${name}\` | \`${cmd}\` |`);
    }
  }

  return lines.join("\n");
}

function renderTree(nodes: TreeNode[], prefix: string = ""): string {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const icon = node.type === "directory" ? "" : "";
    lines.push(`${prefix}${connector}${icon}${node.name}`);

    if (node.children && node.children.length > 0) {
      const childPrefix = prefix + (isLast ? "    " : "\u2502   ");
      lines.push(renderTree(node.children, childPrefix));
    }
  }

  return lines.join("\n");
}

function generateProjectStructure(data: ProjectData): string {
  if (data.tree.length === 0) return "";

  const tree = renderTree(data.tree);
  return `## Project Structure\n\n\`\`\`\n${tree}\n\`\`\``;
}

function generateEnvVars(data: ProjectData): string {
  if (!data.envExample || data.envExample.length === 0) return "";

  const lines: string[] = [
    "## Environment Variables",
    "",
    "Create a `.env` file based on `.env.example`:",
    "",
    "| Variable | Description |",
    "|----------|-------------|",
  ];

  for (const v of data.envExample) {
    lines.push(`| \`${v}\` | *Configure as needed* |`);
  }

  return lines.join("\n");
}

function generateApiReference(meta: ProjectMeta): string {
  const apiFrameworks = ["Express", "Fastify", "Hono", "Koa", "Nest.js"];
  const hasApi = meta.framework && apiFrameworks.includes(meta.framework.name);

  if (!hasApi) return "";

  return [
    "## API Reference",
    "",
    `This project uses **${meta.framework!.name}** as its HTTP framework.`,
    "",
    "<!-- TODO: Document your API endpoints here -->",
    "",
    "| Method | Endpoint | Description |",
    "|--------|----------|-------------|",
    "| `GET` | `/` | Health check |",
  ].join("\n");
}

function generateTesting(meta: ProjectMeta, data: ProjectData): string {
  if (!meta.testFramework) return "";

  return [
    "## Testing",
    "",
    `This project uses **${meta.testFramework.name}** for testing.`,
    "",
    "```bash",
    `npm test`,
    "```",
  ].join("\n");
}

function generateDocker(meta: ProjectMeta, data: ProjectData): string {
  if (!meta.hasDocker) return "";

  const lines: string[] = ["## Docker", ""];

  if (data.hasDockerfile) {
    lines.push("```bash");
    lines.push(`docker build -t ${meta.name} .`);
    lines.push(`docker run -p 3000:3000 ${meta.name}`);
    lines.push("```");
  }

  if (data.hasDockerCompose) {
    lines.push("");
    lines.push("Or with Docker Compose:");
    lines.push("");
    lines.push("```bash");
    lines.push("docker-compose up -d");
    lines.push("```");
  }

  return lines.join("\n");
}

function generateLicense(meta: ProjectMeta): string {
  if (!meta.license) return "";
  return `## License\n\nThis project is licensed under the **${meta.license}** license.`;
}

function generateAuthor(meta: ProjectMeta): string {
  if (!meta.author) return "";

  const lines: string[] = ["## Author", "", `**${meta.author}**`];

  if (meta.homepage) {
    lines.push(`- Website: ${meta.homepage}`);
  }
  if (meta.repositoryUrl) {
    lines.push(`- Repository: ${meta.repositoryUrl}`);
  }

  return lines.join("\n");
}
