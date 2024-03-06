type ValueOf<T> = T extends Set<infer TVal>
  ? TVal
  : never;

export class PassThrough {
  rows = 80;
  columns = 20;

  private encoder = new TextEncoder();

  private events = {
    resize: new Set<() => void>(),
    data: new Set<(buffer: string | Uint8Array) => void>(),
    error: new Set<(error: Error) => void>(),
    close: new Set<() => void>(),
  };

  resize({rows, columns}: {rows: number, columns: number}) {
    this.rows = rows;
    this.columns = columns;

    for (const cb of this.events.resize) {
      cb();
    }
  }

  addListener<TEventName extends keyof PassThrough[`events`]>(event: TEventName, cb: ValueOf<PassThrough[`events`][TEventName]>) {
    this.events[event].add(cb as any);
  }

  removeListener<TEventName extends keyof PassThrough[`events`]>(event: TEventName, cb: ValueOf<PassThrough[`events`][TEventName]>) {
    this.events[event].delete(cb as any);
  }

  write(data: string | Uint8Array) {
    const encoded = typeof data === `string`
      ? this.encoder.encode(data)
      : data;

    for (const cb of this.events.data) {
      cb(encoded);
    }
  }

  pause() {
  }
}
