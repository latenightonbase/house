/**
 * Performance Check Script
 * Run this to verify console.log statements have been removed
 * 
 * Usage: node scripts/check-performance.js
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const dirsToScan = [
  'app',
  'components',
  'utils',
  'middleware.ts',
];

// Files to exclude
const excludePatterns = [
  'node_modules',
  '.next',
  'check-performance.js',
  'PERFORMANCE_OPTIMIZATIONS.md',
];

let totalLogs = 0;
let fileCount = 0;
const logsPerFile = {};

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath) {
  if (shouldExclude(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const logs = [];
    
    lines.forEach((line, index) => {
      // Match console.log, console.info, console.debug (but not console.error)
      if (/console\.(log|info|debug|warn)\s*\(/.test(line) && !line.trim().startsWith('//')) {
        logs.push({ line: index + 1, content: line.trim() });
      }
    });
    
    if (logs.length > 0) {
      const relativePath = path.relative(process.cwd(), filePath);
      logsPerFile[relativePath] = logs;
      totalLogs += logs.length;
      fileCount++;
    }
  } catch (error) {
    // Ignore read errors
  }
}

function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !shouldExclude(fullPath)) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
        scanFile(fullPath);
      }
    });
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }
}

console.log('🔍 Scanning codebase for console.log statements...\n');

dirsToScan.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
});

console.log('📊 Performance Check Results\n');
console.log('=' .repeat(60));
console.log(`Total console.log statements found: ${totalLogs}`);
console.log(`Files with console.log: ${fileCount}`);
console.log('=' .repeat(60));

if (totalLogs > 0) {
  console.log('\n⚠️  Console.log statements found in:\n');
  
  Object.entries(logsPerFile)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([file, logs]) => {
      console.log(`\n📁 ${file} (${logs.length} logs)`);
      logs.slice(0, 3).forEach(log => {
        console.log(`   Line ${log.line}: ${log.content.substring(0, 80)}${log.content.length > 80 ? '...' : ''}`);
      });
      if (logs.length > 3) {
        console.log(`   ... and ${logs.length - 3} more`);
      }
    });
  
  console.log('\n💡 Recommendation:');
  console.log('Consider removing or wrapping these in:');
  console.log('  if (process.env.NODE_ENV === "development") console.log(...)');
} else {
  console.log('\n✅ No console.log statements found!');
  console.log('Your codebase is clean and optimized.');
}

console.log('\n' + '=' .repeat(60));
console.log('Performance optimization status:');
console.log(totalLogs === 0 ? '✅ EXCELLENT' : totalLogs < 10 ? '🟡 GOOD' : totalLogs < 30 ? '🟠 NEEDS WORK' : '🔴 POOR');
console.log('=' .repeat(60) + '\n');
