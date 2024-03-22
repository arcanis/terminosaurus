'use client';

import * as terminosaurusReact from 'terminosaurus/react';
import {XTerm, XTermScreenIn, XTermScreenOut}  from 'terminosaurus/xterm';
import * as terminosaurus from 'terminosaurus';
import React, {useEffect, useRef} from 'react';
import {PassThrough} from 'stream';

export function XTermRun({code, rows}: {code: string, rows?: number}) {
    const stdin = useRef<XTermScreenIn>();
    if (!stdin.current)
        stdin.current = new PassThrough();

    const stdout = useRef<XTermScreenOut>();
    if (!stdout.current) {
        stdout.current = new PassThrough() as any as XTermScreenOut;
        stdout.current.columns = 80;
        stdout.current.rows = 24;
    }

    useEffect(() => {
        const fn = new Function(`React, module, exports, require`, code);

        const run = (arg1?: any, arg2?: any) => {
            const opts = typeof arg1 === `function` ? {} : {...arg1};
            const cb = typeof arg1 === `function` ? arg1 : arg2;

            opts.stdin = stdin.current;
            opts.stdout = stdout.current;

            return terminosaurus.run(opts, cb);
        };

        const render = (arg1?: any, arg2?: any) => {
            const opts = typeof arg2 !== `undefined` ? {...arg1} : {};
            const element = typeof arg2 !== `undefined` ? arg2 : arg1;

            opts.stdin = stdin.current;
            opts.stdout = stdout.current;

            return terminosaurusReact.render(opts, element);
        };

        const patchedTerminosaurus = {
            __proto__: terminosaurus,
            run,
        };

        const patchedTerminosaurusReact = {
            __proto__: terminosaurusReact,
            render,
        };

        const vendors = {
            [`react`]: React,
            [`terminosaurus`]: patchedTerminosaurus,
            [`terminosaurus/react`]: patchedTerminosaurusReact,
        };

        const module = {exports: {}};
        const require = (p: string) => {
            if (!Object.hasOwn(vendors, p))
                throw new Error(`require is not supported (${p})`);

            return (vendors as any)[p];
        };

        fn(React, module, module.exports, require);
    }, []);

    return <pre><code>
        <XTerm stdin={stdin.current} stdout={stdout.current} rows={rows}/>
    </code></pre>;
}
