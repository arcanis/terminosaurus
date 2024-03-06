import {TermPty}    from '#sources/elements/TermPty';
import {TermScreen} from 'terminosaurus';

import fs           from 'fs';
import path         from 'path';
import {useState}   from 'react';

const examples = fs.readdirSync(__dirname);

export function App(screen: TermScreen) {
  const [pty, setPty] = useState<TermPty | null>(null);

  const handleClick = (exampleFile: string) => {
    pty!.spawn(`yarn`, [`node`, `--import`, `tsx`, `./examples/index.ts`, path.join(`./examples`, exampleFile)]);
  };

  return (
    <term:div flexDirection={`row`} width={`100%`} height={`100%`}>
      <term:div width={20} border={`modern`}>
        {examples.map((exampleFile) => (
          <term:button key={exampleFile} decorated={true} onClick={() => handleClick(exampleFile)}>
            {exampleFile}
          </term:button>
        ))}
      </term:div>
      <term:div flex={1} border={`modern`}>
        <term:pty ref={setPty} flexGrow={1}/>
      </term:div>
    </term:div>
  );
}
