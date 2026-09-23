const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const oniguruma = require('vscode-oniguruma');
const textmate = require('vscode-textmate');

const root = path.resolve(__dirname, '..');
const grammarPath = path.join(root, 'syntaxes/aerofyl.tmLanguage.json');

function scopesFor(line, tokens, start, end) {
  return tokens
    .filter((token) => token.startIndex <= start && token.endIndex >= end)
    .flatMap((token) => token.scopes);
}

function scopeAt(line, tokens, text) {
  const start = line.indexOf(text);
  assert.notEqual(start, -1, `Expected ${JSON.stringify(text)} in ${JSON.stringify(line)}.`);
  return scopesFor(line, tokens, start, start + text.length);
}

async function main() {
  const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer;
  await oniguruma.loadWASM(wasm);

  const registry = new textmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (value) => new oniguruma.OnigString(value)
    }),
    loadGrammar: async (scopeName) => {
      if (scopeName !== 'source.aerofyl') return null;
      return textmate.parseRawGrammar(fs.readFileSync(grammarPath, 'utf8'), grammarPath);
    }
  });
  const grammar = await registry.loadGrammar('source.aerofyl');
  assert.ok(grammar, 'Expected the AeroFyl TextMate grammar to load.');

  const checks = [
    ['use std.io;', 'std.io', 'entity.name.namespace.stdlib.aerofyl'],
    ['public int add(int x, int y) {', 'add', 'entity.name.function.aerofyl'],
    ['struct Point {', 'Point', 'entity.name.type.struct.aerofyl'],
    ['enum Result {', 'Result', 'entity.name.type.enum.aerofyl'],
    ['Result.ok(42);', 'ok', 'constant.other.enum.variant.aerofyl'],
    ['string.byte(0);', 'byte', 'variable.other.member.aerofyl'],
    ['bool value = true && false;', 'true', 'constant.language.boolean.aerofyl'],
    ['float ratio = 3.14;', '3.14', 'constant.numeric.float.aerofyl'],
    ['char newline = \'\\n\';', '\\n', 'constant.character.escape.aerofyl'],
    ['print("public \\" return");', '\\"', 'constant.character.escape.aerofyl'],
    ['// public return', 'public', 'comment.line.double-slash.aerofyl'],
    ['"public return"', 'public', 'string.quoted.double.aerofyl']
  ];

  for (const [line, text, expectedScope] of checks) {
    const { tokens } = grammar.tokenizeLine(line);
    assert.ok(
      scopeAt(line, tokens, text).includes(expectedScope),
      `${JSON.stringify(text)} in ${JSON.stringify(line)} should have ${expectedScope}.`
    );
  }

  const keywordPrefix = 'int keywordPrefix = 1;';
  const keywordTokens = grammar.tokenizeLine(keywordPrefix).tokens;
  assert.ok(
    !scopeAt(keywordPrefix, keywordTokens, 'keywordPrefix').some((scope) => scope === 'keyword.control.aerofyl'),
    'Identifiers containing keyword text must not receive a keyword scope.'
  );

  console.log('Loaded and tokenized AeroFyl grammar checks successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
