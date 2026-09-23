const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const packageJson = readJson('package.json');
const languageConfig = readJson('language-configuration.json');
const grammar = readJson('syntaxes/aerofyl.tmLanguage.json');

const language = packageJson.contributes.languages.find(({ id }) => id === 'aerofyl');
const grammarContribution = packageJson.contributes.grammars.find(
  ({ language: id, scopeName }) => id === 'aerofyl' && scopeName === 'source.aerofyl'
);

if (!language || !language.extensions.includes('.fyl')) {
  throw new Error('AeroFyl must be registered for .fyl files.');
}
if (!grammarContribution || grammar.scopeName !== 'source.aerofyl') {
  throw new Error('AeroFyl must contribute the source.aerofyl grammar.');
}
if (languageConfig.comments.lineComment !== '//' || languageConfig.comments.blockComment.join(' ') !== '/* */') {
  throw new Error('AeroFyl comment configuration is incomplete.');
}
if (grammar.scopeName !== 'source.aerofyl' || !grammar.repository) {
  throw new Error('The TextMate grammar is incomplete.');
}

function visit(value, location = 'grammar') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.match === 'string') new RegExp(value.match);
  if (typeof value.begin === 'string') new RegExp(value.begin);
  if (typeof value.end === 'string' && value.end !== '$') new RegExp(value.end);
  Object.entries(value).forEach(([key, child]) => visit(child, `${location}.${key}`));
}

visit(grammar);
console.log('Validated package, language configuration, grammar JSON, and regex syntax.');
