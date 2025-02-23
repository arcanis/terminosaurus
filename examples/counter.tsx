import {TermScreen} from 'terminosaurus';
import { useState } from 'react';

export function App(screen: TermScreen) {
  const [counter, setCounter] = useState(0);

  const handleClick = () => {
    setCounter(counter + 1);
  };

  return (
    <term:div onClick={handleClick}>
      Counter is {counter}; click on me!
    </term:div>
  );
}
