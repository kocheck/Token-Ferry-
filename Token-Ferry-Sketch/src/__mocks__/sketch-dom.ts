// Mock for sketch/dom module used in tests

export class Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

export class Group {
  name: string;
  frame: Rectangle;
  parent: unknown;
  layers: unknown[] = [];
  constructor(opts: { name: string; frame: Rectangle; parent?: unknown }) {
    this.name = opts.name;
    this.frame = opts.frame;
    this.parent = opts.parent;
  }
  adjustToFit() {}
}

export class ShapePath {
  name: string;
  sketchObject: unknown = null;
  constructor(opts: { name: string; [key: string]: unknown }) {
    this.name = opts.name;
  }
  static ShapeType = { Rectangle: 'Rectangle', Triangle: 'Triangle' };
}

export class Text {
  text: string;
  constructor(opts: { text: string; [key: string]: unknown }) {
    this.text = opts.text;
  }
  static Alignment = { center: 'center' };
  static VerticalAlignment = { center: 'center' };
}

export class Style {
  static FillType = { Color: 0 };
  static BorderPosition = { Inside: 0, Center: 1 };
}

export class Swatch {
  name: string;
  color: string;
  id: string;
  constructor(opts: { name: string; color: string }) {
    this.name = opts.name;
    this.color = opts.color;
    this.id = Math.random().toString(36).slice(2);
  }
  static from(opts: { name: string; color: string }): Swatch {
    return new Swatch(opts);
  }
}

let _mockDocument: { swatches: Swatch[]; selectedPage: unknown; centerOnLayer: () => void } | null = null;

export function __setMockDocument(doc: typeof _mockDocument) {
  _mockDocument = doc;
}

function getSelectedDocument() {
  return _mockDocument;
}

const sketch = {
  Rectangle,
  Group,
  ShapePath,
  Text,
  Style,
  Swatch,
  getSelectedDocument,
};

export default sketch;
export { getSelectedDocument };
