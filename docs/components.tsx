import fs from 'fs';
import {transpile} from 'drdoc/src/lib/transpile';

import {XTermRun} from './XTermRun';
import path from 'path';

export function XTermExample({code, rows, children}: {code: string, rows?: number, children: React.ReactNode}) {
    return <div>
        {children}
        
        <div className={`mt-2`}>
            <XTermRun code={transpile(code)} rows={rows}/>
        </div>
    </div>;
}

const spawn = `
    if (typeof exports.run !== "undefined") {
        require("terminosaurus").run(screen => {
            const animate = exports.run(screen);
            animate && setInterval(animate, 1000 / 60);
        });
    }

    if (typeof exports.App !== "undefined") {
        require("terminosaurus/react").render(React.createElement(exports.App));
    }
`;

export async function XTermFullExample({path}: {path: string}) {
    const code = await fs.promises.readFile(`${process.env.DOCS_DIR!}/../examples/${path}`, `utf8`);

    return (
        <XTermRun className={`absolute inset-4`} code={transpile(code) + spawn}/>
    );
}
