import {TermElement, TermScreen} from 'terminosaurus';

function renderFn(element: TermElement, x: number, y: number, l: number) {
  let res = ``;

  for (let t = 0; t < l; ++t) {
    const r = Math.floor((x + t) / element.contentRect.w * 255);
    const g = Math.floor(y / element.contentRect.h * 255);
    const b = 0;

    res += `\x1b[38;2;${r};${g};${b}m█`;
  }

  return res;
}

export function App(screen: TermScreen) {
  return (
    <term:canvas width={`100%`} height={`100%`} render={renderFn}/>
  );
}
