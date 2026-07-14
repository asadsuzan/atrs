const fs = require('fs');
const path = require('path');

// Since this script is inside the docs directory, __dirname is docsDir
const docsDir = __dirname;
const outputFile = path.join(docsDir, 'nav.json');

function buildTree(currentPath, basePath) {
    const tree = [];
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            if (item === '.vitepress' || item === 'node_modules') continue;
            
            const children = buildTree(itemPath, basePath);
            if (children.length > 0) {
                tree.push({
                    type: 'directory',
                    name: item,
                    children: children
                });
            }
        } else if (item.endsWith('.md')) {
            const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
            
            // Extract the title from the first heading if possible, otherwise use filename
            let title = item.replace('.md', '');
            try {
                const content = fs.readFileSync(itemPath, 'utf-8');
                const match = content.match(/^#\s+(.*)/m);
                if (match) {
                    title = match[1].trim();
                }
            } catch (e) {
                // Ignore read errors
            }

            tree.push({
                type: 'file',
                name: title,
                filename: item,
                path: relativePath
            });
        }
    }

    // Sort: directories first, then files alphabetically
    return tree.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}

console.log('Generating docs navigation tree...');
const tree = buildTree(docsDir, docsDir);

fs.writeFileSync(outputFile, JSON.stringify(tree, null, 2));
console.log(`Navigation tree written to ${outputFile}`);
