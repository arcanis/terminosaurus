'use client';

import * as terminosaurusReact from 'terminosaurus/react';
import {XTerm, XTermScreenIn, XTermScreenOut}  from 'terminosaurus/xterm';
import * as terminosaurus from 'terminosaurus';
import React, {useEffect, useRef} from 'react';
import ollama from 'ollama/browser';
import * as reactRedux from 'react-redux';
import * as reduxToolkit from '@reduxjs/toolkit';
import * as anthropic from '@anthropic-ai/sdk';
import {PassThrough} from 'stream';

import grammar from '#data/languages/TypeScript.tmLanguage.json';
import theme   from '#data/themes/WinterIsComing.json';

export function XTermRun({className = ``, code, rows}: {className?: string, code: string, rows?: number}) {
    const stdin = useRef<XTermScreenIn>();
    if (!stdin.current)
        stdin.current = new PassThrough();

    const stdout = useRef<XTermScreenOut>();
    if (!stdout.current) {
        stdout.current = new PassThrough() as any as XTermScreenOut;
        stdout.current.columns = 80;
        stdout.current.rows = 24;
    }

    const cleanupRef = useRef<() => void>();

    useEffect(() => {
        if (cleanupRef.current)
            return;

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
            [`@anthropic-ai/sdk`]: anthropic,
            [`@reduxjs/toolkit`]: reduxToolkit,
            [`ollama`]: {default: ollama},
            [`react-redux`]: reactRedux,
            [`react`]: React,
            [`terminosaurus`]: patchedTerminosaurus,
            [`terminosaurus/react`]: patchedTerminosaurusReact,
            [`#data/languages/TypeScript.tmLanguage.json`]: {default: grammar},
            [`#data/themes/WinterIsComing.json`]: {default: theme},
        };

        const module = {exports: {}};
        const require = (p: string) => {
            if (!Object.hasOwn(vendors, p))
                throw new Error(`require is not supported (${p})`);

            return (vendors as any)[p];
        };

        const rafTimers = new Set<number>();

        const fakeRequestAnimationFrame = (cb: () => void) => {
            const id = requestAnimationFrame(() => {
                rafTimers.delete(id);
                cb();
            });

            rafTimers.add(id);
            return id;
        };

        const fakeClearAnimationFrame = (id: number) => {
            cancelAnimationFrame(id);
            rafTimers.delete(id);
        };

        const interalTimers = new Set<ReturnType<typeof setInterval>>();

        const fakeSetInterval = (cb: () => void, ms: number) => {
            const id = setInterval(cb, ms);
            interalTimers.add(id);
            return id;
        };

        const fakeClearInterval = (id: ReturnType<typeof setInterval>) => {
            clearInterval(id);
            interalTimers.delete(id);
        };

        const timeoutTimers = new Set<ReturnType<typeof setTimeout>>();

        const fakeSetTimeout = (cb: () => void, ms: number) => {
            const id = setTimeout(() => {
                timeoutTimers.delete(id);
                cb();
            }, ms);

            timeoutTimers.add(id);
            return id;
        };

        const fakeClearTimeout = (id: ReturnType<typeof setTimeout>) => {
            clearTimeout(id);
            timeoutTimers.delete(id);
        };

        const fn = new Function(`
            React,
            
            module,
            exports,
            require,

            requestAnimationFrame,
            cancelAnimationFrame,

            setInterval,
            clearInterval,

            setTimeout,
            clearTimeout,
        `, code);

        fn(
            React,
            
            module,
            module.exports,
            require,
            
            fakeRequestAnimationFrame,
            fakeClearAnimationFrame,
            fakeSetInterval,
            fakeClearInterval,
            fakeSetTimeout,
            fakeClearTimeout,
        );

        cleanupRef.current = () => {
            for (const id of rafTimers)
                cancelAnimationFrame(id);

            for (const id of interalTimers)
                clearInterval(id);

            for (const id of timeoutTimers)
                clearTimeout(id);

            rafTimers.clear();
            interalTimers.clear();
            timeoutTimers.clear();
        };

        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, []);

    return (
        <pre className={`mt-0 ${className} flex flex-col`}>
            <div className={`flex space-x-2 mb-4 flex-none`}>
                <div className={`w-2 h-2 rounded-full bg-red-300`}/>
                <div className={`w-2 h-2 rounded-full bg-yellow-300`}/>
                <div className={`w-2 h-2 rounded-full bg-green-300`}/>
            </div>

            <code className={`flex flex-1`}>
                <XTerm className={`w-full`} stdin={stdin.current} stdout={stdout.current} rows={rows}/>
            </code>
        </pre>
    );
}
