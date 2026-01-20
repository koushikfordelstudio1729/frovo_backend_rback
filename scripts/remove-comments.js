const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Comments to preserve (eslint directives, important annotations)
const PRESERVE_PATTERNS = [
  /eslint-disable/,
  /eslint-enable/,
  /eslint-ignore/,
  /ts-ignore/,
  /ts-expect-error/,
  /ts-nocheck/,
  /@ts-/,
  /TODO:/,
  /FIXME:/,
  /NOTE:/,
];

function shouldPreserveComment(comment) {
  return PRESERVE_PATTERNS.some(pattern => pattern.test(comment));
}

function removeComments(content) {
  let result = '';
  let i = 0;
  const len = content.length;

  while (i < len) {
    // Check for string literals (don't remove comments inside strings)
    if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
      const quote = content[i];
      result += content[i];
      i++;

      // Handle template literals with expressions
      if (quote === '`') {
        while (i < len) {
          if (content[i] === '\\' && i + 1 < len) {
            result += content[i] + content[i + 1];
            i += 2;
          } else if (content[i] === '`') {
            result += content[i];
            i++;
            break;
          } else {
            result += content[i];
            i++;
          }
        }
      } else {
        // Regular string
        while (i < len && content[i] !== quote) {
          if (content[i] === '\\' && i + 1 < len) {
            result += content[i] + content[i + 1];
            i += 2;
          } else {
            result += content[i];
            i++;
          }
        }
        if (i < len) {
          result += content[i];
          i++;
        }
      }
    }
    // Check for single-line comment
    else if (content[i] === '/' && content[i + 1] === '/') {
      const commentStart = i;
      let commentEnd = i;

      // Find end of line
      while (commentEnd < len && content[commentEnd] !== '\n') {
        commentEnd++;
      }

      const comment = content.slice(commentStart, commentEnd);

      // Preserve important comments
      if (shouldPreserveComment(comment)) {
        result += comment;
        i = commentEnd;
      } else {
        // Check if this line only has the comment (remove entire line including leading whitespace)
        let lineStart = commentStart;
        while (lineStart > 0 && content[lineStart - 1] !== '\n' && /\s/.test(content[lineStart - 1])) {
          lineStart--;
        }

        const beforeComment = content.slice(lineStart, commentStart);

        if (beforeComment.trim() === '') {
          // Comment is on its own line, remove leading whitespace too
          // But keep the newline structure
          result = result.slice(0, result.length - beforeComment.length);
          i = commentEnd;
          // Skip the newline too to avoid empty lines
          if (i < len && content[i] === '\n') {
            i++;
          }
        } else {
          // Comment is at end of line with code, just remove comment
          i = commentEnd;
        }
      }
    }
    // Check for multi-line comment
    else if (content[i] === '/' && content[i + 1] === '*') {
      const commentStart = i;
      i += 2;

      // Find end of comment
      while (i < len - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
        i++;
      }
      i += 2; // Skip */

      const comment = content.slice(commentStart, i);

      // Preserve important comments
      if (shouldPreserveComment(comment)) {
        result += comment;
      } else {
        // Check if comment is on its own line(s)
        let lineStart = commentStart;
        while (lineStart > 0 && content[lineStart - 1] !== '\n' && /\s/.test(content[lineStart - 1])) {
          lineStart--;
        }

        const beforeComment = content.slice(lineStart, commentStart);

        if (beforeComment.trim() === '') {
          result = result.slice(0, result.length - beforeComment.length);
          // Skip trailing whitespace and newline
          while (i < len && content[i] === ' ') i++;
          if (i < len && content[i] === '\n') i++;
        }
      }
    }
    // Check for regex literals (don't confuse with comments)
    else if (content[i] === '/') {
      // Simple heuristic: if preceded by = ( , [ ! & | : ; { } or start, it's likely regex
      const prevNonSpace = result.trimEnd().slice(-1);
      if ('=([,!&|:;{}'.includes(prevNonSpace) || result.trimEnd() === '') {
        result += content[i];
        i++;
        // Read until closing /
        while (i < len && content[i] !== '/') {
          if (content[i] === '\\' && i + 1 < len) {
            result += content[i] + content[i + 1];
            i += 2;
          } else if (content[i] === '\n') {
            // Not a regex, just a division
            break;
          } else {
            result += content[i];
            i++;
          }
        }
        if (i < len && content[i] === '/') {
          result += content[i];
          i++;
          // Read flags
          while (i < len && /[gimsuy]/.test(content[i])) {
            result += content[i];
            i++;
          }
        }
      } else {
        result += content[i];
        i++;
      }
    }
    else {
      result += content[i];
      i++;
    }
  }

  // Clean up multiple empty lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = removeComments(content);

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    return true;
  }
  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      callback(filePath);
    }
  }
}

// Main execution
let modifiedCount = 0;

walkDir(SRC_DIR, (filePath) => {
  const relativePath = path.relative(SRC_DIR, filePath);

  if (processFile(filePath)) {
    console.log(`Cleaned: ${relativePath}`);
    modifiedCount++;
  }
});

console.log(`\nDone! Modified ${modifiedCount} files.`);
console.log('Preserved: eslint directives, ts-ignore, TODO, FIXME, NOTE comments');
