import {Point} from '#sources/misc/Point';

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const emptyRect: Rect = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
};

export function getBoundingRect(rects: Array<Rect>): Rect {
  const output = {...rects[0]};

  for (let t = 1; t < rects.length; ++t) {
    const rect = rects[t];
    if (rect.w === 0 || rect.h === 0)
      continue;

    if (rect.x < output.x) {
      output.w += output.x - rect.x;
      output.x = rect.x;
    }

    if (rect.y < output.y) {
      output.h += output.y - rect.y;
      output.y = rect.y;
    }

    if (rect.x + rect.w > output.x + output.w)
      output.w += rect.x + rect.w - output.x - output.w;

    if (rect.y + rect.h > output.y + output.h) {
      output.h += rect.y + rect.h - output.y - output.h;
    }
  }

  return output;
}

export function getIntersectingRect(rects: Array<Rect>): Rect | null {
  const output = {...rects[0]};

  for (let t = 1; t < rects.length; ++t) {
    const rect = rects[t];
    if (rect.w === 0 || rect.h === 0)
      return null;

    const x = Math.max(output.x, rect.x);
    const y = Math.max(output.y, rect.y);

    output.w = Math.max(0, Math.min(output.x + output.w, rect.x + rect.w) - x);
    output.h = Math.max(0, Math.min(output.y + output.h, rect.y + rect.h) - y);

    if (output.w === 0 || output.h === 0)
      return null;

    output.x = x;
    output.y = y;
  }

  return output;
}

export function compareRects(a: Rect, b: Rect): boolean {
  if (a === b)
    return true;

  const isEmptyA = a.w === 0 || b.h === 0;
  const isEmptyB = b.w === 0 || b.h === 0;

  if (isEmptyA || isEmptyB)
    return isEmptyA && isEmptyB;

  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function substractRect(a: Rect, b: Rect): Array<Rect> {
  if (a.w === 0 || a.h === 0)
    return [];

  const intersection = getIntersectingRect([a, b]);
  if (!intersection || intersection.w === 0 || intersection.h === 0)
    return [{...a}];

  const results: Array<Rect> = [];
  if (intersection.x > a.x)
    results.push({x: a.x, y: intersection.y, w: intersection.x - a.x, h: intersection.h});
  if (intersection.x + intersection.w < a.x + a.w)
    results.push({x: intersection.x + intersection.w, y: intersection.y, w: a.x + a.w - intersection.x - intersection.w, h: intersection.h});
  if (intersection.y > a.y)
    results.push({x: a.x, y: a.y, w: a.w, h: intersection.y - a.y});
  if (intersection.y + intersection.h < a.y + a.h)
    results.push({x: a.x, y: intersection.y + intersection.h, w: a.w, h: a.y + a.h - intersection.y - intersection.h});

  return results;
}

export function getBarycenter(rect: Rect): Point | null {
  if (rect.w === 0 || rect.h === 0)
    return null;

  return {x: rect.x + rect.w / 2, y: rect.y + rect.h / 2};
}
