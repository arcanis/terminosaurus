import {
  StyleValues,
  TermElement,
  TermScreen,
  length,
} from 'terminosaurus';

export function run(screen: TermScreen) {
  const ball = new TermElement();
  ball.appendTo(screen.rootNode);

  ball.style.reset({
    position: StyleValues.Position.Absolute,

    left: length(0),
    top: length(0),
    width: length(10),
    height: length(5),

    borderTopCharacter: `x`,
    borderBottomCharacter: `x`,
    borderLeftCharacter: `y`,
    borderRightCharacter: `y`,

    backgroundCharacter: `#`,
  });

  let dx = +1;
  let dy = +1;

  return () => {
    if (ball.styleManager.computed.left.value + dx >= screen.rootNode.elementRect.w - ball.elementRect.w) {
      ball.style.set({left: length(screen.rootNode.elementRect.w - ball.elementRect.w)});
      dx = -1;
    } else if (ball.styleManager.computed.left.value + dx < 0) {
      ball.style.set({left: StyleValues.Length.Zero});
      dx = +1;
    } else {
      ball.style.set({left: length(ball.styleManager.computed.left.value + dx)});
    }

    if (ball.styleManager.computed.top.value + dy >= screen.rootNode.elementRect.h - ball.elementRect.h) {
      ball.style.set({top: length(screen.rootNode.elementRect.h - ball.elementRect.h)});
      dy = -1;
    } else if (ball.styleManager.computed.top.value + dy < 0) {
      ball.style.set({top: StyleValues.Length.Zero});
      dy = +1;
    } else {
      ball.style.set({top: length(ball.styleManager.computed.top.value + dy)});
    }
  };
}
