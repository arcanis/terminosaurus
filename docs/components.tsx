import {XTermRun} from './XTermRun';

export function XTermExample({transpiled, rows, children}: {transpiled: string, rows?: number, children: React.ReactNode}) {
    return <div>
        {children}
        <XTermRun code={transpiled} rows={rows}/>
    </div>;
}
