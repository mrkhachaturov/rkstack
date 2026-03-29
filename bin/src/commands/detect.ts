import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

export interface LangInfo {
  files: number;
  code: number;
  complexity: number;
}

export interface DetectionResult {
  projectType: string;
  langs: Record<string, LangInfo>;
  tools: Record<string, boolean>;
  services: Record<string, boolean>;
  repoMode: string;
  totalFiles: number;
  totalCode: number;
  detectedAt: string;
}

const LANG_MAP: Record<string, string | null> = {
  'TypeScript': 'ts',
  'JavaScript': 'js',
  'Python': 'py',
  'Go': 'go',
  'Rust': 'rs',
  'Java': 'java',
  'C#': 'cs',
  'Ruby': 'rb',
  'Shell': 'shell',
  'BASH': 'shell',
  'C': 'c',
  'C++': 'cpp',
  'C Header': 'c',
  'C++ Header': 'cpp',
  'CSS': 'css',
  'SCSS': 'css',
  'SASS': 'css',
  'HTML': 'html',
  'HCL': 'hcl',
  'Terraform': 'hcl',
  'Markdown': null,
  'JSON': null,
  'YAML': null,
  'TOML': null,
  'XML': null,
  'License': null,
  'Plain Text': null,
  'Go Template': null,
  'gitignore': null,
  'Docker ignore': null,
};

export function parseSccOutput(output: string): Pick<DetectionResult, 'langs' | 'totalFiles' | 'totalCode'> {
  const langs: Record<string, LangInfo> = {};
  let totalFiles = 0;
  let totalCode = 0;

  for (const line of output.split('\n')) {
    if (line.startsWith('─') || line.includes('Language') || !line.trim()) continue;

    const match = line.match(/^(.+?)\s{2,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (!match) continue;

    const [, rawName, filesStr, , , , codeStr, complexityStr] = match;
    const name = rawName.trim();
    const files = parseInt(filesStr, 10);
    const code = parseInt(codeStr, 10);
    const complexity = parseInt(complexityStr, 10);

    if (name === 'Total') {
      totalFiles = files;
      totalCode = code;
      continue;
    }

    const key = LANG_MAP[name];
    if (key === null || key === undefined) continue;

    if (langs[key]) {
      langs[key].files += files;
      langs[key].code += code;
      langs[key].complexity += complexity;
    } else {
      langs[key] = { files, code, complexity };
    }
  }

  return { langs, totalFiles, totalCode };
}
