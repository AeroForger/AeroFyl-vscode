# AeroFyl for Visual Studio Code

Language support for [AeroFyl](https://github.com/AeroForger/AeroFyl), a systems-programming language with C-style syntax. This extension recognizes `.fyl` source files and uses the AeroFyl specification as its highlighting source of truth.

## Included support

- AeroFyl language registration for `.fyl` files
- Theme-aware TextMate syntax highlighting for documented declarations, types, literals, strings, characters, escapes, imports, members, calls, operators, punctuation, comments, structs, and enums
- Standard editor behavior for `//` and `/* ... */` comments, brackets, auto-closing pairs, and C-style brace indentation
- The unmodified official AeroFyl logo for language and Marketplace branding

This extension does not provide IntelliSense, completion, diagnostics, formatting, compilation, go-to-definition, or an LSP. Richer tooling such as an AeroFyl Language Server may be added later.

## Development install

1. Open this folder in VS Code.
2. Select **Run AeroFyl Language Support** and press `F5` to launch an Extension Development Host.
3. Open `examples/example.fyl`; VS Code should select **AeroFyl** automatically.

The included fixture exercises documented syntax and is useful for checking your active color theme.

## Package and install

```bash
npm install
npm run validate
npm test
npm run package
code --install-extension aerofyl-language-support-0.1.0.vsix
```

`npm run package` invokes `vsce package --no-dependencies`; the extension has no runtime dependencies, and this keeps development-only tooling out of the `.vsix`.

The `publisher` in `package.json` is deliberately a placeholder. Replace it with the Marketplace publisher account that owns a future release before publishing; do not publish under the placeholder identity.

## Highlighting limits

TextMate grammars tokenize text with regular expressions; they do not parse or type-check a whole program. As a result, semantic distinctions that depend on declarations in another file (for example, every user-defined type or enum variant) are highlighted where the local syntax makes them practical, not guaranteed in every context.

## References

- [AeroFyl repository](https://github.com/AeroForger/AeroFyl)
- [AeroFyl specification](https://github.com/AeroForger/AeroFyl/tree/main/spec)
