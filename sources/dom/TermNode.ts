let currentNodeId = 0;

function wouldContainItself<TNode extends TermNode<any>>(node: TNode, parentNode: TNode): boolean {
  if (node === parentNode)
    return true;

  return node.childNodes.some(child => {
    return wouldContainItself(child, parentNode);
  });
}

export class TermNode<TNode extends TermNode<any>> {
  public type = `node`;

  public id = currentNodeId++;

  public rootNode: TNode = this as any as TNode;
  public parentNode: TNode | null = null;

  public previousSibling: TNode | null = null;
  public nextSibling: TNode | null = null;

  public childNodes: Array<TNode> = [];

  firstChild() {
    return this.childNodes.length === 0 ? null : this.childNodes[0];
  }

  lastChild() {
    return this.childNodes.length === 0 ? null : this.childNodes[this.childNodes.length - 1];
  }

  appendTo(node: TNode) {
    if (wouldContainItself(this as any as TNode, node))
      throw new Error(`Failed to execute 'appendTo': The new child element contains the parent.`);

    this.remove();

    node.appendChild(this);
  }

  appendChild(node: TNode) {
    if (!Reflect.getOwnPropertyDescriptor(node, `parentNode`)!.writable)
      throw new Error(`Failed to execute 'appendChild': The new child element doesn't allow being appended to another node.`);

    if (wouldContainItself(node, this as any as TNode))
      throw new Error(`Failed to execute 'appendChild': The new child element contains the parent.`);

    node.remove();

    this.linkBefore(node, null);
  }

  insertBefore(node: TNode, referenceNode: TNode | null) {
    if (!Reflect.getOwnPropertyDescriptor(node, `parentNode`)!.writable)
      throw new Error(`Failed to execute 'insertBefore': The new child element doesn't allow being appended to another node.`);

    if (wouldContainItself(node, this as any as TNode))
      throw new Error(`Failed to execute 'insertBefore': The new child element contains the parent.`);

    if (referenceNode && referenceNode.parentNode !== this)
      throw new Error(`Failed to execute 'insertBefore': The node before which the new node is to be inserted is not a child of this node.`);

    node.remove();

    this.linkBefore(node, referenceNode);
  }

  protected linkBefore(node: TNode, referenceNode: TNode | null) {
    const index = referenceNode
      ? this.childNodes.indexOf(referenceNode)
      : this.childNodes.length;

    if (node.parentNode)
      node.remove();

    node.parentNode = this;

    node.previousSibling = referenceNode
      ? referenceNode.previousSibling
      : this.lastChild();

    node.nextSibling = referenceNode;

    if (node.nextSibling)
      node.nextSibling.previousSibling = node;

    if (node.previousSibling)
      node.previousSibling.nextSibling = node;

    this.childNodes.splice(index, 0, node);

    node.traverse(traversedNode => {
      traversedNode.rootNode = this.rootNode;
    });
  }

  removeChild(node: TNode) {
    if (node.parentNode !== this)
      throw new Error(`Failed to execute 'removeChild': The node to be removed is not a child of this node.`);

    node.parentNode = null;

    if (node.previousSibling)
      node.previousSibling.nextSibling = node.nextSibling;

    if (node.nextSibling)
      node.nextSibling.previousSibling = node.previousSibling;

    node.previousSibling = null;
    node.nextSibling = null;

    const index = this.childNodes.indexOf(node);
    this.childNodes.splice(index, 1);

    node.traverse(traversedNode => {
      traversedNode.rootNode = node;
    });
  }

  remove() {
    if (!this.parentNode)
      return;

    this.parentNode.removeChild(this);
  }

  traverse(fn: (node: TNode, depth: number) => void, {depth = Infinity, currentDepth = 0} = {}) {
    if (currentDepth >= depth)
      return;

    fn(this as any as TNode, currentDepth);

    for (const child of this.childNodes) {
      child.traverse(fn, {depth, currentDepth: currentDepth + 1});
    }
  }
}
