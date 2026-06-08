const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'client/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(clientDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('../components/ui/')) {
    content = content.replace(/\.\.\/components\/ui\//g, '@/components/ui/');
    changed = true;
  }
  if (content.includes('../ui/')) {
    content = content.replace(/\.\.\/ui\//g, '@/components/ui/');
    changed = true;
  }

  // Fix implicit any
  if (content.includes('({ field })')) {
    content = content.replace(/\({ field }\)/g, '({ field }: any)');
    changed = true;
  }
  if (content.includes('onSubmit={(data)')) {
    content = content.replace(/onSubmit=\{\(data\)/g, 'onSubmit={(data: any)');
    changed = true;
  }
  if (content.includes('onChange={(e)')) {
    content = content.replace(/onChange=\{\(e\)/g, 'onChange={(e: any)');
    changed = true;
  }
  if (content.includes('onChange={async (e)')) {
    content = content.replace(/onChange=\{async \(e\)/g, 'onChange={async (e: any)');
    changed = true;
  }
  if (content.includes('onOpenChange={(open)')) {
    content = content.replace(/onOpenChange=\{\(open\)/g, 'onOpenChange={(open: boolean)');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Done fixing TS files');
