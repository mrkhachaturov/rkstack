import { describe, test, expect } from 'bun:test';
import { parseSccOutput, type LangInfo } from '../bin/src/commands/detect';

const SAMPLE_SCC = `─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Language                              Files     Lines   Blanks  Comments     Code Complexity Complexity/Lines
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Markdown                                 85     33243     8475         0    24768          0             0.00
TypeScript                               44     11503     1495      1139     8869       1093           625.49
Go Template                              42     11040     3020         0     8020          0             0.00
HTML                                     16       828       64         4      760          0             0.00
JSON                                     14       186        0         0      186          0             0.00
Shell                                    14       738      115       144      479        146           437.40
YAML                                      3       264       46        10      208          0             0.00
JavaScript                                2       442       70        20      352         70            44.60
BASH                                      1       212       17        39      156         60            38.46
License                                   1        21        4         0       17          0             0.00
Plain Text                                1         3        0         0        3          0             0.00
TOML                                      1         4        0         0        4          0             0.00
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Total                                   224     58484    13306      1356    43822       1369          1145.95
─────────────────────────────────────────────────────────────────────────────────────────────────────────────`;

describe('parseSccOutput', () => {
  test('parses language rows into structured data', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect(result.langs.ts).toEqual({ files: 44, code: 8869, complexity: 1093 });
    expect(result.langs.js).toEqual({ files: 2, code: 352, complexity: 70 });
    expect(result.langs.shell).toEqual({ files: 15, code: 635, complexity: 206 });
  });

  test('maps language names to short keys', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect('ts' in result.langs).toBe(true);
    expect('js' in result.langs).toBe(true);
    expect('shell' in result.langs).toBe(true);
    expect('TypeScript' in result.langs).toBe(false);
  });

  test('extracts totalFiles and totalCode from Total row', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect(result.totalFiles).toBe(224);
    expect(result.totalCode).toBe(43822);
  });

  test('handles empty SCC output', () => {
    const result = parseSccOutput('scc not available');
    expect(Object.keys(result.langs)).toHaveLength(0);
    expect(result.totalFiles).toBe(0);
    expect(result.totalCode).toBe(0);
  });

  test('ignores non-code languages (Markdown, JSON, License, Plain Text, TOML)', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect('markdown' in result.langs).toBe(false);
    expect('json' in result.langs).toBe(false);
    expect('license' in result.langs).toBe(false);
  });
});
