import {type Rect} from '#sources/misc/Rect';

export type Point = {
  x: number;
  y: number;
};

export function isInsideRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.w && point.y < rect.y + rect.h;
}

export function getPointLength(point: Point) {
  return Math.sqrt(point.x ** 2 + point.y ** 2);
}

export function getDistanceFromRect(point: Point, rect: Rect): Point {
  const x = point.x < rect.x
    ? rect.x - point.x
    : point.x >= rect.x + rect.w
      ? rect.x + rect.w - point.x + 1
      : 0;

  const y = point.y < rect.y
    ? rect.y - point.y
    : point.y >= rect.y + rect.h
      ? rect.y + rect.h - point.y + 1
      : 0;

  return {x, y};
}
