# readme-gen

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)

> Auto-generates a beautiful README.md from your project's structure — no more blank READMEs

## Features

- CLI tool
- TypeScript support

## Tech Stack

**Runtime:**
- TypeScript v5.9.3

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
cd readme-gen
npm install
```

Or install globally:

```bash
npm install -g readme-gen
```

## Usage

### CLI

```bash
readme-gen
```

### Available Scripts

| Script | Command |
|--------|---------|
| `npm run build` | `tsc` |
| `npm run start` | `node dist/index.js` |
| `npm run dev` | `tsc && node dist/index.js` |

## Project Structure

```
├── src
│   ├── detector.ts
│   ├── formatter.ts
│   ├── generator.ts
│   ├── index.ts
│   └── scanner.ts
├── package.json
├── README.md
└── tsconfig.json
```

## License

This project is licensed under the **MIT** license.

## Author

**Zakaria Kone**
