import { Writable } from 'stream';
import { default as sax, Tag, QualifiedTag, QualifiedAttribute } from 'sax';
import { Parser, Feed } from './parser';


type XMLAttribute = {
  text?: string;
  [key: string]: string | QualifiedAttribute | undefined;
};
type XMLObject = string | XMLAttribute | {
  [key: string]: string | XMLObject | XMLObject[];
};
type XMLAny = {
  [key: string]: XMLObject | XMLObject[];
}
type XMLRoot = {
  type?: string;
  text?: string;
  item?: XMLObject | XMLObject[];
  entry?: XMLObject | XMLObject[];
  [key: string]: string | XMLObject | XMLObject[] | XMLAny | undefined;
}


/**
 * If this object has text, and there is no other children,
 * or the only other key is type, make the object the text.
 *
 * @param {Object} obj
 * @returns {Object}
 */
const cleanObj = (obj: XMLAttribute) => {
  let keys = Object.keys(obj).length;
  if (obj.text != null) {
    // If this tag has text, trim it.
    obj.text = trimIndent(obj.text);

    if (keys === 1 || (keys === 2 && obj.type != null)) {
      return obj.text;
    }
  } else if (keys === 0) {
    return '';
  }
  return obj;
};


/**
 * Trims the indent from text that sax-js emits. Some xml feeds will
 * add indent to multiline text. Example:
 *
 *     <item>
 *       The big brown fox
 *       jumped over the lazy dog
 *     </item>
 *
 * @param {string} str
 * @returns {string}
 */
const trimIndent = (str: string) => {
  let split = str.split('\n'), rs;

  // The last line should be indented and only contain whitespace.
  if (split.length > 1 &&
     (rs = /^((?: {3})+|(?: {2})+|(?: {4})+|(?:\t)+)$/m.exec(
       split[split.length - 1]))) {

    // The very first line should be empty.
    if (split.shift() !== '') {
      return str;
    }

    // Remove the last line, as it's only whitespace.
    split.pop();

    let wholeindent = rs[0] + rs[1];

    // Remove indent from beginning of every line.
    for (let i = 0, l = split.length; i < l; i++) {
      let s = split[i];
      if (s.indexOf(wholeindent) !== 0) {
        return str;
      }
      split[i] = s.substr(wholeindent.length);
    }

    str = split.join('\n');
  }

  return str;
};


/**
 * Parses an RSS/Atom feed.
 *
 * @param {boolean} buffer If true, will buffer entire object.
 * @return {sax.Stream}
 */
export default class XMLFeedParser extends Writable implements Parser {
  _buffer: boolean;
  parser: Writable;
  private _root: XMLRoot;
  private _obj: XMLAny;

  constructor(buffer: boolean) {
    super();
    this._buffer = buffer;
    const parser = this.parser = sax.createStream(false, { lowercase: true });
    const stack: {
      obj: XMLObject;
      key: string;
      i?: number;
    }[] = [];
    this._root = this._obj = {};

    // First start listening for the root tag.
    const openf1 = (node: Tag | QualifiedTag) => {
      if (node.name === 'channel' || node.name === 'feed') {
        if (node.name === 'feed') {
          let type = 'atom';
          this._root.type = type;
          parser.emit('type', type);
        }
        parser.removeListener('opentag', openf1);
        parser.on('text', ontext);
        parser.on('cdata', ontext);
        parser.on('opentag', onopentag);
        parser.on('closetag', onclosetag);

      } else if (node.name === 'rss' || node.name === 'rdf:rdf') {
        let type = 'rss ' + (node.attributes.version || '1.0');
        this._root.type = type;
        parser.emit('type', type);
      } else {
        parser.removeListener('opentag', openf1);
        parser.emit('error', new Error('Feed type not recognized'));
        // parser.closed = true;
      }
    };
    parser.on('opentag', openf1);

    const ontext = (text: string) => {
      // Make sure text events are text and not just whitespace.
      const rs = /\n(( {3})+|( {2})+|( {4})+|(\t)+)$/m.exec(text);
      if (rs !== null && rs.index === 0 && rs[0] === rs.input) { return; }
      const obj = this._obj as XMLAttribute;
      if (obj.text == null) { obj.text = ''; }
      obj.text += text;
    };

    // After the root is found, start storing the rest of the document.
    const onopentag = (node: Tag | QualifiedTag) => {
      const key = node.name;
      let i;

      if (this._obj[key]) {
        if (!Array.isArray(this._obj[key])) {
          this._obj[key] = [this._obj[key], node.attributes] as XMLObject[];
          i = 1;
        } else {
          i = (this._obj[key] as XMLObject[]).push(node.attributes) - 1;
        }

      } else {
        this._obj[key] = node.attributes;
      }

      stack.push({ obj: this._obj, key, i });
      this._obj = node.attributes as XMLAny;
    };

    const onclosetag = () => {
      const parent = stack.pop();
      if (!parent) { return; }

      this._obj = parent.obj as XMLAny;
      const key = parent.key;
      const data = parent.i ?
        (this._obj[key] as XMLObject[])[parent.i] = cleanObj((this._obj[key] as XMLAttribute[])[parent.i]) :
        this._obj[key] = cleanObj(this._obj[key] as XMLAttribute);

      if (!stack.length) {
        let skey = key === 'entry' || key === 'items' ? 'item' : key;
        // Some feeds will contain a summary of items at the top.
        // Ignore this.
        if (key !== 'items' || Array.isArray(data)) {
          parser.emit(skey, data);
          if (!this._buffer) { delete this._obj[key]; }
        }
      }
    };
  }

  _write(chunk: Buffer, encoding: BufferEncoding, callback: (err?: Error | null) => void) {
    this.parser.write(chunk, encoding);
    callback(null);
  }

  _final(callback: (err?: Error | null) => void) {
    this.parser.end();
    callback(null);
  }

  // Called when done parsing the document.
  // Returns entire document in object form.
  done() {
    if (!this._buffer) { return; }
    let items: XMLObject | XMLObject[];
    if (this._root.item != null) {
      items = this._root.item;
      delete this._root.item;
    } else if (this._root.entry != null) {
      items = this._root.entry;
      delete this._root.entry;
    } else {
      items = [];
    }
    if (!Array.isArray(items)){
      items = [items];
    }
    this._root.items = items;
    delete this._root.text;
    return this._root as Feed;
  }
}
