export const config = {
  title: `terminosaurus`,
  description: `A terminal UI library for React`,

  repository: `arcanis/terminosaurus`,
  mainBranch: `main`,

  theme: {
    primaryColor: `#f97316`,
    secondaryColor: `#eb5c78`,
  },

  logo: {
    viewbox: `-5 -5 24 24`,
    icon: `<path fill="currentColor" fill-rule="evenodd" d="M1.546 12.25V3.314h10.908v8.934a.204.204 0 0 1-.205.205H1.751a.204.204 0 0 1-.205-.205Zm-1.5-10.5C.046.81.81.047 1.751.047h10.498c.942 0 1.705.763 1.705 1.705V12.25c0 .942-.763 1.705-1.705 1.705H1.751A1.704 1.704 0 0 1 .046 12.25z" clip-rule="evenodd"/>`,
  },

  hero: {
    title: `Terminosaurus`,
    description: `Terminosaurus is a UI library for terminals. Bring your React apps to the terminal with ease!`,
    filter: ``,
  },

  example: {
    language: `tsx`,
    code: `
      import {useState} from 'react';
      import {render} from 'terminosaurus/react';
      
      function App() {
        const [counter, setCounter] = useState(0);
    
        return (
          <term:div onClick={() => setCounter(counter + 1)}>
            Counter: {counter}
          </term:div>
        );
      }
    
      render({}, <App/>);
    `,
  },
};
