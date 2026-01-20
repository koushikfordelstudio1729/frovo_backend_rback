#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

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

function removeConsoleStatements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let removedCount = 0;

  // 1. Remove standalone console.log/error/warn/info statements (single line)
  content = content.replace(
    /^[ \t]*console\.(log|error|warn|info|debug)\([^)]*\);?[ \t]*\r?\n/gm,
    () => { removedCount++; return ''; }
  );

  // 2. Remove multi-line console statements (with template literals or long strings)
  content = content.replace(
    /^[ \t]*console\.(log|error|warn|info|debug)\([\s\S]*?\);[ \t]*\r?\n/gm,
    () => { removedCount++; return ''; }
  );

  // 3. Remove .catch(err => console.error(...)) patterns - replace with empty catch
  content = content.replace(
    /\.catch\(\s*\w*\s*=>\s*console\.(log|error|warn|info)\([^)]*\)\s*\)/g,
    () => { removedCount++; return '.catch(() => {})'; }
  );

  // 4. Remove .catch(err => console.error("...", err)) patterns
  content = content.replace(
    /\.catch\(\s*(\w+)\s*=>\s*console\.(log|error|warn|info)\([^)]*\1[^)]*\)\s*\)/g,
    () => { removedCount++; return '.catch(() => {})'; }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✓ Cleaned: ${relativePath} (${removedCount} statements)`);
    return { cleaned: true, count: removedCount };
  }

  return { cleaned: false, count: 0 };
}

function main() {
  console.log('Removing console.* statements from src/...');
  console.log('(logger.* statements will be preserved)\n');

  const files = getAllTsFiles(SRC_DIR);
  let cleanedFiles = 0;
  let totalRemoved = 0;

  for (const file of files) {
    const result = removeConsoleStatements(file);
    if (result.cleaned) {
      cleanedFiles++;
      totalRemoved += result.count;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Files cleaned: ${cleanedFiles}`);
  console.log(`  Statements removed: ${totalRemoved}`);
}

main();
