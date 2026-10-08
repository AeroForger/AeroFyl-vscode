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
    ['Result.ok(42);', 'Result', 'entity.name.type.enum.aerofyl'],
    ['Result result = Result.ok(42);', 'Result', 'entity.name.type.aerofyl'],
    ['Result.ok(42);', 'ok', 'constant.other.enum.variant.aerofyl'],
    ['public int add(int x, int y) {', 'x', 'variable.parameter.aerofyl'],
    ['public int add(int x, int y) {', 'y', 'variable.parameter.aerofyl'],
    ['if (true) {} else {}', 'if', 'keyword.control.flow.aerofyl'],
    ['if (true) {} else {}', 'else', 'keyword.control.flow.aerofyl'],
    ['while (true) {}', 'while', 'keyword.control.flow.aerofyl'],
    ['for (int i = 0; i < 2; i += 1) {}', 'for', 'keyword.control.flow.aerofyl'],
    ['string.byte(0);', 'byte', 'variable.other.member.support.aerofyl'],
    ['nums.push(4);', 'push', 'variable.other.member.support.aerofyl'],
    ['result.is(Result.ok);', 'is', 'variable.other.member.support.aerofyl'],
    ['found.hasValue;', 'hasValue', 'variable.other.member.support.aerofyl'],
    ['print("hi");', 'print', 'keyword.other.declaration.aerofyl'],
    ['println("hi");', 'println', 'support.function.stdlib.io.aerofyl'],
    ['eprintln("hi");', 'eprintln', 'support.function.stdlib.io.aerofyl'],
    ['readFile("a");', 'readFile', 'support.function.stdlib.fs.aerofyl'],
    ['exists("a");', 'exists', 'support.function.stdlib.fs.aerofyl'],
    ['exit(1);', 'exit', 'support.function.builtin.aerofyl'],
    ['optional int f = some(42);', 'some', 'support.function.builtin.aerofyl'],
    ['optional int m = none();', 'none', 'support.function.builtin.aerofyl'],
    ['ref int r = reference(x);', 'reference', 'support.function.builtin.aerofyl'],
    ['using lexer: scan, Token;', 'using', 'keyword.other.module.aerofyl'],
    ['using lexer: scan, Token;', 'lexer', 'entity.name.namespace.module.aerofyl'],
    ['using lexer: scan, Token;', 'scan, Token', 'variable.other.import.aerofyl'],
    ['println(\\f"hi {name}");', '\\f"', 'string.quoted.double.interpolated.aerofyl'],
    ['println(\\f"hi {name}");', '{name}', 'variable.other.interpolation.aerofyl'],
    ['println(\\f"a \\{b\\}");', '\\{', 'constant.character.escape.aerofyl'],
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

  let stack = null;
  for (const [line, member] of [
    ['enum Color {', null],
    ['  red,', 'red'],
    ['  blue', 'blue'],
    ['}', null]
  ]) {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    if (member) assert.ok(scopeAt(line, result.tokens, member).includes('entity.name.enum.variant.aerofyl'));
  }

  const keywordPrefix = 'int keywordPrefix = 1;';
  const keywordTokens = grammar.tokenizeLine(keywordPrefix).tokens;
  assert.ok(
    !scopeAt(keywordPrefix, keywordTokens, 'keywordPrefix').some((scope) => scope === 'keyword.control.flow.aerofyl'),
    'Identifiers containing keyword text must not receive a keyword scope.'
  );

  const memberLine = 'nums.push(4);';
  const memberTokens = grammar.tokenizeLine(memberLine).tokens;
  assert.ok(
    !scopeAt(memberLine, memberTokens, 'nums').some((scope) => scope === 'entity.name.type.enum.aerofyl'),
    'Lowercase member accesses must not receive an enum scope.'
  );

  console.log('Loaded and tokenized AeroFyl grammar checks successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
