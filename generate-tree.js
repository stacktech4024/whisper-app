const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = process.cwd(); // Current directory
const OUTPUT_FILE = 'project-structure.txt';

// Files and folders to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.angular',
  'dist',
  'coverage',
  '.nyc_output',
  'e2e',
  '.vscode',
  '.idea',
  '*.log',
  '.DS_Store',
  'Thumbs.db'
];

// File extensions to focus on (Angular-specific)
const IMPORTANT_EXTENSIONS = [
  '.ts', '.js', '.html', '.css', '.scss', '.sass', '.less',
  '.json', '.md', '.yml', '.yaml'
];

function shouldIgnore(filePath, fileName) {
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      return fileName.includes(pattern.replace('*', ''));
    }
    return filePath.includes(pattern) || fileName === pattern;
  });
}

function isImportantFile(fileName) {
  return IMPORTANT_EXTENSIONS.some(ext => fileName.endsWith(ext));
}

function generateFileTree(dir, prefix = '', isRoot = true) {
  let result = '';
  
  if (isRoot) {
    result += `Project: ${path.basename(dir)}\n`;
    result += `Path: ${dir}\n`;
    result += `Generated: ${new Date().toLocaleString()}\n\n`;
  }

  try {
    const items = fs.readdirSync(dir);
    const filteredItems = items.filter(item => {
      const itemPath = path.join(dir, item);
      return !shouldIgnore(itemPath, item);
    });

    // Sort: directories first, then files
    filteredItems.sort((a, b) => {
      const aPath = path.join(dir, a);
      const bPath = path.join(dir, b);
      const aIsDir = fs.statSync(aPath).isDirectory();
      const bIsDir = fs.statSync(bPath).isDirectory();
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    filteredItems.forEach((item, index) => {
      const itemPath = path.join(dir, item);
      const isLast = index === filteredItems.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      try {
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          result += `${prefix}${connector}📁 ${item}/\n`;
          result += generateFileTree(itemPath, newPrefix, false);
        } else if (isImportantFile(item)) {
          // Add file type emoji
          let emoji = '📄';
          if (item.endsWith('.ts')) emoji = '📘';
          else if (item.endsWith('.html')) emoji = '🌐';
          else if (item.endsWith('.css') || item.endsWith('.scss')) emoji = '🎨';
          else if (item.endsWith('.json')) emoji = '⚙️';
          else if (item.endsWith('.md')) emoji = '📝';
          
          result += `${prefix}${connector}${emoji} ${item}\n`;
        }
      } catch (err) {
        result += `${prefix}${connector}❌ ${item} (access denied)\n`;
      }
    });
  } catch (err) {
    result += `${prefix}❌ Cannot read directory: ${err.message}\n`;
  }

  return result;
}

function generateRoutesInfo(dir) {
  let routesInfo = '\n=== ROUTING INFORMATION ===\n\n';
  
  try {
    // Look for routing files
    const findRoutingFiles = (directory) => {
      const files = [];
      const items = fs.readdirSync(directory);
      
      items.forEach(item => {
        const itemPath = path.join(directory, item);
        if (shouldIgnore(itemPath, item)) return;
        
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          files.push(...findRoutingFiles(itemPath));
        } else if (item.includes('routing') || item.includes('routes')) {
          files.push(itemPath);
        }
      });
      
      return files;
    };

    const routingFiles = findRoutingFiles(dir);
    
    if (routingFiles.length > 0) {
      routesInfo += 'Found routing files:\n';
      routingFiles.forEach(file => {
        const relativePath = path.relative(dir, file);
        routesInfo += `  📘 ${relativePath}\n`;
      });
    } else {
      routesInfo += 'No routing files found.\n';
    }

    // Look for component files
    const findComponents = (directory) => {
      const components = [];
      const items = fs.readdirSync(directory);
      
      items.forEach(item => {
        const itemPath = path.join(directory, item);
        if (shouldIgnore(itemPath, item)) return;
        
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          components.push(...findComponents(itemPath));
        } else if (item.endsWith('.component.ts')) {
          components.push(itemPath);
        }
      });
      
      return components;
    };

    const components = findComponents(dir);
    
    if (components.length > 0) {
      routesInfo += '\nFound components:\n';
      components.forEach(comp => {
        const relativePath = path.relative(dir, comp);
        routesInfo += `  📘 ${relativePath}\n`;
      });
    }

  } catch (err) {
    routesInfo += `Error gathering routing info: ${err.message}\n`;
  }

  return routesInfo;
}

// Generate the file tree
console.log('Generating Angular project file tree...');
const fileTree = generateFileTree(PROJECT_ROOT);
const routesInfo = generateRoutesInfo(PROJECT_ROOT);
const fullOutput = fileTree + routesInfo;

// Write to file
fs.writeFileSync(OUTPUT_FILE, fullOutput);

console.log(`\nFile tree generated and saved to: ${OUTPUT_FILE}`);
console.log(`Total lines: ${fullOutput.split('\n').length}`);
console.log('\n' + '='.repeat(50));
console.log('PREVIEW:');
console.log('='.repeat(50));
console.log(fullOutput.substring(0, 1000) + (fullOutput.length > 1000 ? '\n... (truncated)' : ''));