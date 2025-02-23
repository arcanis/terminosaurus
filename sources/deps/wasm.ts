import {readFileSync} from 'fs';

export const loadMono = async () => readFileSync(require.resolve(`mono-layout/wasm`));
export const loadOniguruma = async () => readFileSync(require.resolve(`vscode-oniguruma/release/onig.wasm`));
