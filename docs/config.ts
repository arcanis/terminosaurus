export const config = {
  title: `Terminosaurus`,
  description: `A terminal UI library for React`,

  repository: `arcanis/terminosaurus`,
  mainBranch: `main`,

  algolia: {
    appId: `IYF7ONNL0T`,
    apiKey: `1e1e83c3e91cb276524a4806387c8df0`,
    indexName: `clipanion`,
  },

  package: {
    name: `terminosaurus`,
  },

  theme: {
    primaryColor: `#f97316`,
    secondaryColor: `#eb5c78`,
  },

  logo: {
    viewbox: `-5 -5 24 24`,
    icon: `<path fill="currentColor" fill-rule="evenodd" d="M1.546 12.25V3.314h10.908v8.934a.204.204 0 0 1-.205.205H1.751a.204.204 0 0 1-.205-.205Zm-1.5-10.5C.046.81.81.047 1.751.047h10.498c.942 0 1.705.763 1.705 1.705V12.25c0 .942-.763 1.705-1.705 1.705H1.751A1.704 1.704 0 0 1 .046 12.25z" clip-rule="evenodd"/>`,
    title: `terminosaurus`,
  },

  hero: {
    title: `Terminosaurus`,
    description: `Terminosaurus is a graphical UI library for terminals. Bring interactive user interfaces to your CLIs with ease!`,
    filter: ``,
  },

  example: {
    url: `/docs/examples/simple-form`,
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

  featured: [{
    title: `Type Safe`,
    description: `Clipanion provides type inference for the options you declare: no duplicated types to write and keep in sync.`,
  }, {
    title: `Tooling Integration`,
    description: `Because it uses standard ES6 classes, tools like ESLint can easily lint your options to detect the unused ones.`,
  }, {
    title: `Feature Complete`,
    description: `Clipanion supports subcommands, arrays, counters, execution contexts, error handling, option proxying, and much more.`,
  }, {
    title: `Soundness`,
    description: `Clipanion unifies your commands into a proper state machine. It gives little room for bugs, and unlocks command overloads.`,
  }, {
    title: `Tree Shaking`,
    description: `The core is implemented using a functional approach, letting most bundlers only keep what you actually use.`,
  }, {
    title: `Battle Tested`,
    description: `Clipanion is used to power Yarn - likely one of the most complex CLI used everyday by the JavaScript community.`,
  }],
};
