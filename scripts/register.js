const {Module} = require(`module`);
const fs = require(`fs`);

Module._extensions[`.js`] = function(module, filename) {
  const content = fs.readFileSync(filename, `utf8`);
  console.log(`X`, filename);
  module._compile(content, filename);
};

require(`@swc/register`)({extensions: [`.ts`, `.tsx`, `.mjs`, `.js`], ignore: [/\/node_modules\/(?!@mdx-js)[^/]+\//]});
require(`./hmr`);
