import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const themeRoot = `${path.join(sourceRoot, 'theme')}${path.sep}`;
const sourceExtensions = new Set(['.ts', '.tsx']);
const hexPattern = /#[0-9a-f]{3,8}\b/i;
const violations = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolutePath);
    if (!sourceExtensions.has(path.extname(entry.name)) || /\.test\.[tj]sx?$/.test(entry.name)) return [];
    return [absolutePath];
  });
}

function lineAndColumn(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(projectRoot, sourceFile.fileName)}:${position.line + 1}:${position.character + 1}`;
}

function isStaticStyleValue(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  return node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword;
}

function inspectFile(fileName) {
  const source = fs.readFileSync(fileName, 'utf8');
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (
      ts.isJsxAttribute(node) &&
      node.name.text === 'style' &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression &&
      ts.isObjectLiteralExpression(node.initializer.expression)
    ) {
      for (const property of node.initializer.expression.properties) {
        if (ts.isPropertyAssignment(property) && isStaticStyleValue(property.initializer)) {
          violations.push(`${lineAndColumn(sourceFile, property)} static inline style \`${property.name.getText(sourceFile)}\``);
        }
      }
    }

    if (!fileName.startsWith(themeRoot) && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
      if (hexPattern.test(node.text)) {
        violations.push(`${lineAndColumn(sourceFile, node)} application-owned hex literal; move it to src/theme`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

walk(sourceRoot).forEach(inspectFile);

if (violations.length > 0) {
  console.error('Style policy violations:\n');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('\nStatic JSX styles belong in Tailwind/design-system classes; owned colors belong in src/theme.');
  process.exit(1);
}

console.log('Style policy passed: no static inline JSX styles or scattered application-owned hex colors.');
