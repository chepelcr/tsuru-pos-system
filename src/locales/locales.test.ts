import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { enNamespaces, esNamespaces, LOCALE_NAMESPACES, translations } from './index';

const SEMANTIC_COMMON_DUPLICATES = new Set([
  // RBAC/status/content keys are identifiers used by dynamic catalogs. Their
  // copy may diverge from generic UI actions and labels in the future.
  'rbac.action.read',
  'rbac.action.update',
  'rbac.action.delete',
  'rbac.action.remove',
  'analytics.statusActive',
  'orgSettings.hacienda.status',
  'orgSettings.hacienda.statusActive',
  'orgSettings.hacienda.statusInactive',
  'orgSettings.fiscalInfo.steps.name',
  'orgSettings.fiscalInfo.situationStatus',
  'orgSettings.fiscalInfo.email',
  'orgSettings.fiscalInfo.phoneNumber',
  'orgSettings.fiscalInfo.activityDescription',
  'content.section.steps',
  'deployments.status.error',
]);

describe('locale dictionaries', () => {
  it('keeps every namespace and its English/Spanish key set in sync', () => {
    expect(Object.keys(enNamespaces).sort()).toEqual([...LOCALE_NAMESPACES].sort());
    expect(Object.keys(esNamespaces).sort()).toEqual([...LOCALE_NAMESPACES].sort());

    for (const namespace of LOCALE_NAMESPACES) {
      expect(Object.keys(enNamespaces[namespace]).sort()).toEqual(
        Object.keys(esNamespaces[namespace]).sort(),
      );
    }
  });

  it('contains only string messages', () => {
    expect(Object.values(translations.en).every((message) => typeof message === 'string')).toBe(true);
    expect(Object.values(translations.es).every((message) => typeof message === 'string')).toBe(true);
  });

  it('does not duplicate generic common copy under feature-specific keys', () => {
    const commonByMessage = new Map(
      Object.keys(translations.es)
        .filter((key) => key.startsWith('common.'))
        .map((key) => [JSON.stringify([translations.es[key], translations.en[key]]), key]),
    );
    const unapprovedAliases = Object.keys(translations.es).filter((key) => {
      if (key.startsWith('common.') || SEMANTIC_COMMON_DUPLICATES.has(key)) return false;
      return commonByMessage.has(JSON.stringify([translations.es[key], translations.en[key]]));
    });

    expect(unapprovedAliases).toEqual([]);
  });

  it('defines every literal translation key used by source components', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src');
    const sourceFiles: string[] = [];
    const walk = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'locales') walk(filePath);
        } else if (/\.[tj]sx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          sourceFiles.push(filePath);
        }
      }
    };
    walk(sourceRoot);

    const missingKeys: string[] = [];
    for (const filePath of sourceFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node)
          && node.expression.getText(sourceFile) === 't'
          && node.arguments[0]
        ) {
          const collectLiteralKeys = (keyNode: ts.Node) => {
            if (ts.isStringLiteralLike(keyNode)) {
              if (!Object.prototype.hasOwnProperty.call(translations.es, keyNode.text)) {
                const line = sourceFile.getLineAndCharacterOfPosition(keyNode.getStart(sourceFile)).line + 1;
                missingKeys.push(`${path.relative(sourceRoot, filePath)}:${line} ${keyNode.text}`);
              }
              return;
            }
            if (ts.isConditionalExpression(keyNode)) {
              collectLiteralKeys(keyNode.whenTrue);
              collectLiteralKeys(keyNode.whenFalse);
            } else if (ts.isParenthesizedExpression(keyNode)) {
              collectLiteralKeys(keyNode.expression);
            }
          };
          collectLiteralKeys(node.arguments[0]);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    expect(missingKeys).toEqual([]);
  });
});
