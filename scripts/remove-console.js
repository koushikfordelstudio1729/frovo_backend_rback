#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Mapping console methods to logger methods
const CONSOLE_TO_LOGGER = {
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
  'console.debug': 'logger.debug',
};

function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function replaceConsoleWithLogger(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let replacedCount = 0;

  // Skip logger.util.ts itself to avoid circular issues
  if (filePath.includes('logger.util.ts')) {
    return { replaced: false, count: 0 };
  }

  // Replace console.log/error/warn/info/debug with logger equivalents
  for (const [consoleMethod, loggerMethod] of Object.entries(CONSOLE_TO_LOGGER)) {
    const regex = new RegExp(consoleMethod.replace('.', '\\.'), 'g');
    const matches = content.match(regex);
    if (matches) {
      replacedCount += matches.length;
      content = content.replace(regex, loggerMethod);
    }
  }

  // Check if logger import is needed
  if (replacedCount > 0 && content !== originalContent) {
    // Check if logger is already imported
    const hasLoggerImport = /import\s*{\s*logger\s*}/.test(content) ||
                            /import\s+logger/.test(content) ||
                            /from\s+["'].*logger/.test(content);

    if (!hasLoggerImport) {
      // Find the relative path to logger.util.ts
      const fileDir = path.dirname(filePath);
      const loggerPath = path.join(SRC_DIR, 'utils', 'logger.util');
      let relativePath = path.relative(fileDir, loggerPath).replace(/\\/g, '/');

      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }

      // Add logger import at the top after the last complete import block
      const importStatement = `import { logger } from "${relativePath}";\n`;

      // Find the position after all imports (look for last import...from pattern with semicolon)
      // Match complete import statements including multi-line ones
      const importRegex = /^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm;
      let lastImportEnd = 0;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        lastImportEnd = match.index + match[0].length;
      }

      if (lastImportEnd > 0) {
        // Find the next newline after the last import
        const nextNewline = content.indexOf('\n', lastImportEnd);
        if (nextNewline !== -1) {
          content = content.slice(0, nextNewline + 1) + importStatement + content.slice(nextNewline + 1);
        } else {
          content = content + '\n' + importStatement;
        }
      } else {
        // No imports found, add at the beginning (after any comments/docs at top)
        const firstCodeMatch = content.match(/^(?:\/\*[\s\S]*?\*\/\s*|\/\/.*\n)*/);
        const insertPos = firstCodeMatch ? firstCodeMatch[0].length : 0;
        content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✓ Updated: ${relativePath} (${replacedCount} replacements)`);
    return { replaced: true, count: replacedCount };
  }

  return { replaced: false, count: 0 };
}

function main() {
  console.log('Replacing console.* with logger.* in src/...\n');

  const files = getAllTsFiles(SRC_DIR);
  let updatedFiles = 0;
  let totalReplaced = 0;

  for (const file of files) {
    const result = replaceConsoleWithLogger(file);
    if (result.replaced) {
      updatedFiles++;
      totalReplaced += result.count;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Files updated: ${updatedFiles}`);
  console.log(`  Statements replaced: ${totalReplaced}`);
}

main();
