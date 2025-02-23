import {type Config, loadYoga} from 'yoga-layout/load';

type Yoga = Awaited<ReturnType<typeof loadYoga>>;

let yoga: Yoga | undefined;
let yogaConfig: Config | undefined;

function createConfig(yoga: Yoga) {
  const config = yoga.Config.create();
  config.setPointScaleFactor(0);
  return config;
}

export async function initYoga() {
  yoga ??= await loadYoga();
  yogaConfig ??= createConfig(yoga);
}

export function createNode() {
  return yoga!.Node.create(yogaConfig);
}
