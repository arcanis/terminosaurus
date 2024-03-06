const fs = require(`fs`);

export const load = (p: string) => {
  return `module.exports = ${JSON.stringify(fs.readFileSync(p, `utf8`))};`;
};
