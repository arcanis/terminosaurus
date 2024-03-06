import {build}        from 'esbuild';
import {createServer} from 'http';
import {Server}       from 'node-static';

const initialExtensions = [`.tsx`, `.ts`, `.jsx`, `.js`];
const browserExtensions = initialExtensions.map(ext => `.browser${ext}`);

build({
  bundle: true,
  entryPoints: [`website/index.ts`],
  resolveExtensions: [...browserExtensions, ...initialExtensions],
  outfile: `website/index.js`,
  platform: `browser`,
  watch: true,
  loader: {
    [`.wasm`]: `binary`,
  },
  define: {
    [`process.env.TERM`]: `"xterm-256color"`,
    [`process.env.TERM_FEATURES`]: `undefined`,
    [`process.env.COLORTERM`]: `"truecolor"`,
  },
}).then(() => {
  const server = new Server(`website`);
  createServer((request, response) => {
    request.addListener(`end`, () => {
      server.serve(request, response);
    }).resume();
  }).listen(8080, () => {
    console.log(`http://localhost:8080/`);
  });
}).catch(err => {
  console.log(err.stack);
  process.exitCode = 1;
});
