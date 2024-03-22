export const loadMono = async () => (await fetch(require(`mono-layout/wasm`))).arrayBuffer();
export const loadOniguruma = async () => (await fetch(require(`vscode-oniguruma/release/onig.wasm`))).arrayBuffer();
export const loadYogini = async () => (await fetch(require(`yogini/wasm`))).arrayBuffer();
