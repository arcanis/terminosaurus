import {Command, Option, runExit} from 'clipanion';
import {Console}                  from 'console';
import fs                         from 'fs';
import path                       from 'path';
import React                      from 'react';
import {screen}                   from 'term-strings';

import {
  PassThrough,
  ScreenStreams,
  render,
  run,
} from 'terminosaurus/react';
import { RunOptions } from '../sources/dom/TermScreen';

runExit(class Main extends Command {
  public debugPaintRects = Option.Boolean(`--debug-paint-rects`, false);
  public logOutput = Option.Boolean(`--log-output`, false);
  public console = Option.String(`--console`);

  public examplePath = Option.String();

  async execute() {
    let streams: ScreenStreams & RunOptions = {
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      debugPaintRects: this.debugPaintRects,
    };

    if (this.logOutput) {
      streams = makeStreamInterceptor(streams);
    } else if (this.console) {
      const out = fs.createWriteStream(this.console);
      globalThis.console = new Console(out);
      out.write(screen.clear);
    }

    if (this.examplePath.endsWith(`x`)) {
      return await this.executeJsxApi(streams);
    } else {
      return await this.executeJsApi(streams);
    }
  }

  async executeJsApi(streams: ScreenStreams) {
    const {default: demo} = await import(path.resolve(this.examplePath));

    return run(streams, screen => {
      const animate = demo.run(screen);
      if (animate) {
        setInterval(animate, 1000 / 60).unref();
      }
    });
  }

  async executeJsxApi(streams: ScreenStreams) {
    const {default: demo} = await import(path.resolve(this.examplePath));

    return render(streams, React.createElement(demo.App));
  }
});

function makeStreamInterceptor(streams: ScreenStreams): ScreenStreams {
  const stdin = process.stdin;
  const stdout = new PassThrough();

  stdout.columns = streams.stdout.columns ?? 80;
  stdout.rows = streams.stdout.rows ?? 20;

  stdout.addListener(`data`, data => {
    console.log(`OUT:`, JSON.stringify(data.toString()));
  });

  return {stdin, stdout};
}
