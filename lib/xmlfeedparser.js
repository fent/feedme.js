const { Writable } = require('stream');
const sax = require('sax');


/**
 * If this object has text, and there is no other children,
 * or the only other key is type, make the object the text.
 *
 * @param {Object} obj
 * @returns {Object}
 */
const cleanObj = (obj) => {
  let keys = Object.keys(obj).length;
  if (obj.text != null) {
    // If this tag has text, trim it.
    obj.text = trimIndent(obj.text);

    if (keys === 1 || (keys === 2 && obj.type != null)) {
      obj = obj.text;
    }
  } else if (keys === 0) {
    obj = '';
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
const trimIndent = (str) => {
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
module.exports = class XMLFeedParser extends Writable {
  constructor(buffer) {
    super();
    const parser = this.parser = sax.createStream(false, { lowercasetags: true });
    const stack = [];
    this._buffer = buffer;
    this._obj = {};

    // First start listening for the root tag.
    const openf1 = (node) => {
      if (node.name === 'channel' || node.name === 'feed') {
        if (node.name === 'feed') {
          let type = 'atom';
          this._obj.type = type;
          parser.emit('type', type);
        }
        parser.removeListener('opentag', openf1);
        parser.on('text', ontext);
        parser.on('cdata', ontext);
        parser.on('opentag', onopentag);
        parser.on('closetag', onclosetag);

      } else if (node.name === 'rss' || node.name === 'rdf:rdf') {
        let type = 'rss ' + (node.attributes.version || '1.0');
        this._obj.type = type;
        parser.emit('type', type);
      } else {
        parser.removeListener('opentag', openf1);
        parser.emit('error', new Error('Feed type not recognized'));
        parser.closed = true;
      }
    };
    parser.on('opentag', openf1);

    const ontext = (text) => {
      // Make sure text events are text and not just whitespace.
      const rs = /\n(( {3})+|( {2})+|( {4})+|(\t)+)$/m.exec(text);
      if (rs !== null && rs.index === 0 && rs[0] === rs.input) { return; }
      if (this._obj.text == null) { this._obj.text = ''; }
      this._obj.text += text;
    };

    // After the root is found, start storing the rest of the document.
    const onopentag = (node) => {
      const key = node.name;
      let i;

      if (this._obj[key]) {
        if (!Array.isArray(this._obj[key])) {
          this._obj[key] = [this._obj[key], node.attributes];
          i = 1;
        } else {
          i = this._obj[key].push(node.attributes) - 1;
        }

      } else {
        this._obj[key] = node.attributes;
      }

      stack.push({ obj: this._obj, key, i });
      this._obj = i ? this._obj[key][i] : this._obj[key];
    };

    const onclosetag = () => {
      const parent = stack.pop();
      if (!parent) { return; }

      this._obj = parent.obj;
      const key = parent.key;
      const data = parent.i ?
        this._obj[key][parent.i] = cleanObj(this._obj[key][parent.i]) :
        this._obj[key] = cleanObj(this._obj[key]);

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

  _write(chunk, encoding, callback) {
    this.parser.write(chunk, encoding);
    callback(null);
  }

  // Called when done parsing the document.
  // Returns entire document in object form.
  done() {
    if (!this._buffer) { return; }
    let items;
    if (this._obj.item != null) {
      items = this._obj.item;
      delete this._obj.item;
    } else if (this._obj.entry != null) {
      items = this._obj.entry;
      delete this._obj.entry;
    } else {
      items = [];
    }
    if (!Array.isArray(items)){
      items = [items];
    }
    this._obj.items = items;
    delete this._obj.text;
    return this._obj;
  }
};
