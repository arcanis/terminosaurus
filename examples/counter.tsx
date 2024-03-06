import {LoremIpsum}                        from 'lorem-ipsum';
import path from 'path';
import fs from 'fs';

import {TermPty}                           from '#sources/elements/TermPty';
import {stableRandom}                      from '#sources/misc/Rand';
import {StyleValues, TermElement, TermScreen, length} from 'terminosaurus';
import { useState } from 'react';

export function App(screen: TermScreen) {
  const [counter, setCounter] = useState(0);

  const handleClick = () => {
    setCounter(counter + 1);
  };

  return (
    <term:div onClick={handleClick}>
      Counter is {counter}
    </term:div>
  );
}
