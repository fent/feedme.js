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
module.exports = (buffer) => {
  const parser = sax.createStream(false, { lowercasetags: true });
  const stack = [];
  let obj = {};

  // First start listening for the root tag.
  const openf1 = (node) => {
    if (node.name === 'channel' || node.name === 'feed') {
      if (node.name === 'feed') {
        let type = 'atom';
        obj.type = type;
        parser.emit('type', type);
      }
      parser.removeListener('opentag', openf1);
      parser.on('text', ontext);
      parser.on('cdata', ontext);
      parser.on('opentag', onopentag);
      parser.on('closetag', onclosetag);

    } else if (node.name === 'rss' || node.name === 'rdf:rdf') {
      let type = 'rss ' + (node.attributes.version || '1.0');
      obj.type = type;
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
    if (obj.text == null) { obj.text = ''; }
    obj.text += text;
  };

  // After the root is found, start storing the rest of the document.
  const onopentag = (node) => {
    const key = node.name;
    let i;

    if (obj[key]) {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key], node.attributes];
        i = 1;
      } else {
        i = obj[key].push(node.attributes) - 1;
      }

    } else {
      obj[key] = node.attributes;
    }

    stack.push({ obj, key, i });
    obj = i ? obj[key][i] : obj[key];
  };

  const onclosetag = () => {
    const parent = stack.pop();
    if (!parent) { return; }

    obj = parent.obj;
    const key = parent.key;
    const data = parent.i ?
      obj[key][parent.i] = cleanObj(obj[key][parent.i]) :
      obj[key] = cleanObj(obj[key]);

    if (!stack.length) {
      let skey = key === 'entry' || key === 'items' ? 'item' : key;
      // Some feeds will contain a summary of items at the top.
      // Ignore this.
      if (key !== 'items' || Array.isArray(data)) {
        parser.emit(skey, data);
        if (!buffer) { delete obj[key]; }
      }
    }
  };

  // Called when done parsing the document.
  // Returns entire document in object form.
  parser.done = () => {
    if (!buffer) { return; }
    let items;
    if (obj.item != null) {
      items = obj.item;
      delete obj.item;
    } else if (obj.entry != null) {
      items = obj.entry;
      delete obj.entry;
    } else {
      items = [];
    }
    if (!Array.isArray(items)){
      items = [items];
    }
    obj.items = items;
    delete obj.text;
    return obj;
  };

  return parser;
};
