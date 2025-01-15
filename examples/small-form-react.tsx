import {useState} from 'react';

function Form({n}: {n: number}) {
  const th = n === 1 ? `st` : n === 2 ? `nd` : n === 3 ? `rd` : `th`;
  const [value, setValue] = useState(`Hello world`);

  return <>
    <term:div border={`strong`} paddingLeft={1} paddingRight={1}>
      <term:div fontWeight={`bold`} textDecoration={`underline`} onClick={() => setValue(`foo`)}>
        The {n}{th} form entry
      </term:div>
      <term:input decorated={true} multiline={true} marginTop={1} onChange={e => setValue(e.target.text)} text={value}/>
    </term:div>
  </>;
}

export function App() {
  return <>
    {[...Array(10)].map((_, n) => {
      return <Form key={n} n={n}/>;
    })}
  </>;
}
