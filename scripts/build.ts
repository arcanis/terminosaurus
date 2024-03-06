import {build} from 'esbuild';
import pkg     from 'terminosaurus/package.json';

const entryPoints = new Set(Object.values(pkg.exports));
entryPoints.delete(`./package.json`);

const dependencies = new Set([
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]);

build({
  bundle: true,
  entryPoints: [...entryPoints],
  external: [...dependencies],
  outdir: `dist`,
  platform: `node`,
}).catch(err => {
  console.log(err.stack);
  process.exitCode = 1;
});
