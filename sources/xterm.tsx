'use client';

import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import {Terminal}    from '@xterm/xterm';
import {useCallback, useEffect, useRef} from 'react';
import { ScreenIn, ScreenOut } from 'terminosaurus';

export type XTermScreenIn = ScreenIn & {
    write: (data: string) => void;
};

export type XTermScreenOut = ScreenOut & {
    emit: (event: string) => void;
    on: (event: string, cb: Function) => void;
    off: (event: string, cb: Function) => void;
};

class HorizontalFitAddon extends FitAddon {
    public rows?: number;

    override proposeDimensions() {
        const dims = super.proposeDimensions();
        if (!dims)
            return;

        const rows = this.rows ?? (this as any)._terminal.rows as number;
        return {...dims, rows};
    }
}

type XTermState = {
    terminal: Terminal,
    fitAddon: HorizontalFitAddon,
};

function createXTerm(stdinRef: React.MutableRefObject<XTermScreenIn | undefined>, stdoutRef: React.MutableRefObject<XTermScreenOut | undefined>): XTermState {
    const terminal = new Terminal({
        allowTransparency: true,
        theme: {
            foreground: "#EEEEEE",
            background: "#00000000",
            cursor: "#CFF5DB",
        },
    });

    const fitAddon = new HorizontalFitAddon();
    terminal.loadAddon(fitAddon);

    terminal.onData(data => {
        if (!stdinRef.current)
            return;

        stdinRef.current.write(data);
    });

    terminal.onResize(({cols, rows}) => {
        if (!stdoutRef.current)
            return;

        stdoutRef.current.columns = cols;
        stdoutRef.current.rows = rows;

        stdoutRef.current.emit('resize');
    });

    return {
        terminal,
        fitAddon,
    };
}

export function XTerm({stdin, stdout, rows = 24}: {stdin: XTermScreenIn, stdout: XTermScreenOut, rows?: number}) {
    const stdinRef = useRef<XTermScreenIn>();
    const stdoutRef = useRef<XTermScreenOut>();

    const termStateRef = useRef<XTermState>();
    if (!termStateRef.current)
        termStateRef.current = createXTerm(stdinRef, stdoutRef);

    useEffect(() => {
        stdinRef.current = stdin;
    }, [stdin]);

    useEffect(() => {
        stdoutRef.current = stdout;

        const handler = (data: string) => {
            termStateRef.current?.terminal.write(data);
        };

        if (termStateRef.current) {
            stdout.columns = termStateRef.current.terminal.cols;
            stdout.rows = termStateRef.current.terminal.rows;

            stdout.emit(`resize`);
        }

        stdout.on('data', handler);
        return () => {
            stdout.off('data', handler);
        };
    }, [stdout]);

    const handleRef = useCallback((element: HTMLDivElement) => {
        if (!element)
            return;

        if (!termStateRef.current)
            return;
    
        const {terminal, fitAddon} = termStateRef.current;

        terminal.open(element);

        fitAddon.rows = rows;
        fitAddon.fit();
    }, []);

    useEffect(() => {
        if (!termStateRef.current)
            return;

        const {fitAddon} = termStateRef.current;

        fitAddon.rows = rows;
        fitAddon.fit();
    }, [rows]);

    return <div ref={handleRef}/>;
}
