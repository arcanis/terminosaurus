import '#sources/testing';

import {init, TermElement}       from 'terminosaurus';

import {ReactElement, ReactText} from '#sources/react/Tree';

beforeAll(async () => {
  await init();
});

describe(`React`, () => {
  describe(`appendChild`, () => {
    it(`can append an element on an empty parent`, () => {
      const root = new ReactElement(new TermElement());
      const child = new ReactElement(new TermElement());

      root.appendChild(child);

      expect(child.prev).toStrictEqual(null);
      expect(child.next).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([child.termNode]);
    });

    it(`can append an element on a parent that already has one`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactElement(new TermElement());
      const child2 = new ReactElement(new TermElement());

      root.appendChild(child1);
      root.appendChild(child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(child2);

      expect(child2.prev).toStrictEqual(child1);
      expect(child2.next).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode, child2.termNode]);
    });

    it(`can append a text element on an empty parent`, () => {
      const root = new ReactElement(new TermElement());
      const child = new ReactText(`foo`);

      root.appendChild(child);

      expect(root.termNode.childNodes).toStrictEqualArray([child.termNode]);
      expect(child.termNode!.text).toEqual(`foo`);
    });

    it(`can append a text element on a parent that already has one`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactText(`bar`);

      root.appendChild(child1);
      root.appendChild(child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(child2);
      expect(child1.firstText).toStrictEqual(child1);

      expect(child2.prev).toStrictEqual(child1);
      expect(child2.next).toStrictEqual(null);
      expect(child2.firstText).toStrictEqual(child1);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode]);
      expect(child1.termNode!.text).toEqual(`foobar`);
    });
  });

  describe(`insertBefore`, () => {
    it(`can insert an element at the beginning of the element`, () => {
      const root = new ReactElement(new TermElement());
      const child = new ReactElement(new TermElement());
      const inserted = new ReactElement(new TermElement());

      root.appendChild(child);
      root.insertBefore(inserted, child);

      expect(inserted.prev).toStrictEqual(null);
      expect(inserted.next).toStrictEqual(child);

      expect(child.prev).toStrictEqual(inserted);
      expect(child.next).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([inserted.termNode, child.termNode]);
    });

    it(`can insert an element between two others`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactElement(new TermElement());
      const child2 = new ReactElement(new TermElement());
      const inserted = new ReactElement(new TermElement());

      root.appendChild(child1);
      root.appendChild(child2);
      root.insertBefore(inserted, child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(inserted);

      expect(inserted.prev).toStrictEqual(child1);
      expect(inserted.next).toStrictEqual(child2);

      expect(child2.prev).toStrictEqual(inserted);
      expect(child2.next).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([
        child1.termNode,
        inserted.termNode,
        child2.termNode,
      ]);
    });

    it(`can insert a text node before another`, () => {
      const root = new ReactElement(new TermElement());
      const child = new ReactText(`foo`);
      const inserted = new ReactText(`bar`);

      root.appendChild(child);
      root.insertBefore(inserted, child);

      expect(inserted.prev).toStrictEqual(null);
      expect(inserted.next).toStrictEqual(child);
      expect(inserted.firstText).toStrictEqual(inserted);

      expect(child.prev).toStrictEqual(inserted);
      expect(child.next).toStrictEqual(null);
      expect(child.firstText).toStrictEqual(inserted);

      expect(root.termNode.childNodes).toStrictEqualArray([inserted.termNode]);
      expect(inserted.termNode!.text).toEqual(`barfoo`);
    });

    it(`can insert a text node after another`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactElement(new TermElement());
      const inserted = new ReactText(`bar`);

      root.appendChild(child1);
      root.appendChild(child2);
      root.insertBefore(inserted, child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(inserted);
      expect(child1.firstText).toStrictEqual(child1);

      expect(inserted.prev).toStrictEqual(child1);
      expect(inserted.next).toStrictEqual(child2);
      expect(inserted.firstText).toStrictEqual(child1);

      expect(child2.prev).toStrictEqual(inserted);
      expect(child2.next).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode, child2.termNode]);
      expect(child1.termNode!.text).toEqual(`foobar`);
    });

    it(`can insert a text node between two others`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactText(`bar`);
      const inserted = new ReactText(`baz`);

      root.appendChild(child1);
      root.appendChild(child2);
      root.insertBefore(inserted, child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(inserted);
      expect(child1.firstText).toStrictEqual(child1);

      expect(inserted.prev).toStrictEqual(child1);
      expect(inserted.next).toStrictEqual(child2);
      expect(inserted.firstText).toStrictEqual(child1);

      expect(child2.prev).toStrictEqual(inserted);
      expect(child2.next).toStrictEqual(null);
      expect(child2.firstText).toStrictEqual(child1);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode]);
      expect(child1.termNode!.text).toEqual(`foobazbar`);
    });

    it(`can insert a element node between two text nodes`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactText(`bar`);
      const inserted = new ReactElement(new TermElement());

      root.appendChild(child1);
      root.appendChild(child2);
      root.insertBefore(inserted, child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(inserted);
      expect(child1.firstText).toStrictEqual(child1);

      expect(inserted.prev).toStrictEqual(child1);
      expect(inserted.next).toStrictEqual(child2);

      expect(child2.prev).toStrictEqual(inserted);
      expect(child2.next).toStrictEqual(null);
      expect(child2.firstText).toStrictEqual(child2);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode, inserted.termNode, child2.termNode]);
      expect(child1.termNode!.text).toEqual(`foo`);
      expect(child2.termNode!.text).toEqual(`bar`);
    });
  });

  describe(`removeChild`, () => {
    it(`can remove an element`, () => {
      const root = new ReactElement(new TermElement());
      const child = new ReactElement(new TermElement());

      root.appendChild(child);
      root.removeChild(child);

      expect(child.prev).toStrictEqual(null);
      expect(child.next).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([]);
    });

    it(`can remove a text element`, () => {
      const root = new ReactElement(new TermElement());
      const child = new ReactText(`foo`);

      root.appendChild(child);
      root.removeChild(child);

      expect(child.prev).toStrictEqual(null);
      expect(child.next).toStrictEqual(null);
      expect(child.firstText).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([]);
    });

    it.only(`can remove a text element that's located before another text element`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactText(`bar`);

      root.appendChild(child1);
      root.appendChild(child2);
      root.removeChild(child1);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(null);
      expect(child1.firstText).toStrictEqual(null);

      expect(child2.prev).toStrictEqual(null);
      expect(child2.next).toStrictEqual(null);
      expect(child2.firstText).toStrictEqual(child2);

      expect(root.termNode.childNodes).toStrictEqualArray([child2.termNode]);
      expect(child2.termNode!.text).toEqual(`bar`);
    });

    it(`can remove a text element that's located after another text element`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactText(`bar`);

      root.appendChild(child1);
      root.appendChild(child2);
      root.removeChild(child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(null);
      expect(child1.firstText).toStrictEqual(child1);

      expect(child2.prev).toStrictEqual(null);
      expect(child2.next).toStrictEqual(null);
      expect(child2.firstText).toStrictEqual(null);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode]);
      expect(child1.termNode!.text).toEqual(`foo`);
    });

    it(`can remove a text element that's located between two other text element`, () => {
      const root = new ReactElement(new TermElement());
      const child1 = new ReactText(`foo`);
      const child2 = new ReactText(`bar`);
      const child3 = new ReactText(`baz`);

      root.appendChild(child1);
      root.appendChild(child2);
      root.appendChild(child3);
      root.removeChild(child2);

      expect(child1.prev).toStrictEqual(null);
      expect(child1.next).toStrictEqual(child2);
      expect(child1.firstText).toStrictEqual(child1);

      expect(child2.prev).toStrictEqual(null);
      expect(child2.next).toStrictEqual(null);
      expect(child2.firstText).toStrictEqual(null);

      expect(child3.prev).toStrictEqual(child2);
      expect(child3.next).toStrictEqual(null);
      expect(child3.firstText).toStrictEqual(child1);

      expect(root.termNode.childNodes).toStrictEqualArray([child1.termNode, child2.termNode]);
      expect(child1.termNode!.text).toEqual(`foobar`);
    });
  });
});

export {};
