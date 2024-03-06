expect.extend({
  toStrictEqualArray(received: any, expected: Array<any>) {
    if (!Array.isArray(received) || received.length !== expected.length) {
      return {
        message: () => `expected ${received} to be an array of size ${expected.length}`,
        pass: false,
      };
    }

    const pass = received.every((value, t) => {
      return Object.is(value, expected[t]);
    });

    if (pass) {
      return {
        message: () => `expected ${received} not to match the provided array of size ${expected.length}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to match the provided array of size ${expected.length}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toStrictEqualArray(expected: Array<any>): R;
    }
  }
}

export {};
