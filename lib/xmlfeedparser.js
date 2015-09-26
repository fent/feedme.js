var sax = require('sax');


/**
 * If this object has text, and there is no other children,
 * or the only other key is type, make the object the text.
 *
 * @param (Object) obj
 * @returns (Object)
 */
function cleanObj(obj) {
  var keys = Object.keys(obj).length;
  if (obj.text != null) {
    // if this tag has text, trim it
    obj.text = trimIndent(obj.text);

    if (keys === 1 || (keys === 2 && obj.type != null)) {
      obj = obj.text;
    }
  } else if (keys === 0) {
    obj = '';
  }

  return obj;
}


/**
 * Trims the indent from text that sax-js emits.
 *
 * @param (String) str
 * @returns (String)
 */
function trimIndent(str) {
  var split = str.split('\n'), rs;
  if (split.length > 0 &&
     (rs = /^((?: {3})+|(?: {2})+|(?: {4})+|(?:\t)+)$/m.exec(
        split[split.length - 1]))) {

    // Check start and end of str.
    if (split.shift() !== '') {
      return str;
    }
    split.pop();

    var wholeindent = rs[0] + rs[1];

    // Remove indent from beginning of every line.
    for (var i = 0, l = split.length; i < l; i++) {
      var s = split[i];
      if (s.indexOf(wholeindent) !== 0) {
        return str;
      }
      split[i] = s.substr(wholeindent.length);
    }

    str = split.join('\n');
  }

  return str;
}


/**
 * Parses an RSS/Atom feed.
 *
 * @param (Boolean) buffer If true, will buffer entire object.
 * @return (sax.Stream)
 */
module.exports = function(buffer) {
  var parser = sax.createStream(false, { lowercasetags: true });

  // First start listening for the root tag.
  var openf1 = function(node) {
    var type;
    if (node.name === 'channel' || node.name === 'feed') {
      if (node.name === 'feed') {
        type = 'atom';
        obj.type = type;
        this.emit('type', type);
      }
      parser.removeListener('opentag', openf1);
      parser.on('text', ontext);
      parser.on('cdata', ontext);
      parser.on('opentag', onopentag);
      parser.on('closetag', onclosetag);

    } else if (node.name === 'rss') {
      type = 'rss ' + node.attributes.version;
      obj.type = type;
      this.emit('type', type);
    }
  };
  parser.on('opentag', openf1);

  // After the root is found, start storing the rest of the document.
  var stack = [];
  var obj = {};

  function ontext(text) {
    // Make sure text events are text and not just whitespace.
    var rs = /\n(( {3})+|( {2})+|( {4})+|(\t)+)$/m.exec(text);
    if (rs !== null && rs.index === 0 && rs[0] === rs.input) { return; }
    if (obj.text == null) { obj.text = ''; }
    obj.text += text;
  }

  function onopentag(node) {
    var key = node.name;
    var i;

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

    stack.push({ obj: obj, key: key, i: i });
    obj = i ? obj[key][i] : obj[key];
  }

  function onclosetag() {
    var parent = stack.pop();
    if (!parent) { return; }

    obj = parent.obj;
    var key = parent.key;
    var data = parent.i ?
      obj[key][parent.i] = cleanObj(obj[key][parent.i]) :
      obj[key] = cleanObj(obj[key]);

    if (!stack.length) {
      key = key === 'entry' || key === 'items' ? 'item' : key;
      parser.emit(key, data);
      if (!buffer) { delete obj[key]; }
    }
  }

  // Called when done parsing the document.
  // Returns entire document in object form.
  parser.done = function() {
    if (!buffer) { return; }
    var items;
    if (obj) {
      if (obj.item != null) {
        items = obj.item;
        delete obj.item;
      } else if (obj.entry != null) {
        items = obj.entry;
        delete obj.entry;
      }
      if (items != null) {
        if (!Array.isArray(items)){
          items = [items];
        }
        obj.items = items;
      }
    }
    delete obj.text;
    return obj;
  };

  return parser;
};
