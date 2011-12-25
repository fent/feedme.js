var sax = require('sax');


// returns true if object is empty
var isEmpty = function(obj) {
  return (obj != null) && 0 === Object.keys(obj).length;
};


// captures the contents of a tag
var childTag = function(parser, parent, node, parentcb) {
  var obj = {};
  if (!isEmpty(node.attributes)) {
    for (var property in node.attributes) {
      if (node.attributes.hasOwnProperty(property)) {
        obj[property] = node.attributes[property];
      }
    }
  }

  var gottext = '';
  var textf = function(text) {
    // make sure text events are text and not just whitespace
    var rs = /\n(( {3})+|( {2})+|( {4})+|(\t)+)$/m.exec(text);
    if (rs !== null && rs.index === 0 && rs[0] === rs.input)  { return; }
    gottext += text;
  };

  var openf = function(node) {
    if (gottext === '') {
      parser.removeListener('text', textf);
    }
    parser.removeListener('cdata', textf);
    parser.removeListener('closetag', closef);
    childTag(parser, obj, node, cb);
  };

  var closef = function(name) {
    if (gottext === '') {
      parser.removeListener('text', textf);
    }
    parser.removeListener('cdata', textf);
    parser.removeListener('opentag', openf);

    // if this tag has text, trim it
    if (gottext !== '') {
      gottext = trimIndent(gottext);

      // if there is no childrern in this tag, make the whole tag the text
      if (isEmpty(obj)) {
        obj = gottext;
      } else {
        obj.text = gottext;
      }
    }

    // only turn a child element into an array if there is more
    // than one of the same tag name
    if (parent[node.name] !== undefined) {
      if (!Array.isArray(parent[node.name])) {
        parent[node.name] = [parent[node.name]];
      }
      parent[node.name].push(obj);
    } else {
      parent[node.name] = obj;
    }
    return parentcb(node.name, obj);
  };

  // listen for possible children of this tag
  var cb = function() {
    if (!gottext) parser.once('text', textf);
    parser.on('cdata', textf);
    parser.once('opentag', openf);
    parser.once('closetag', closef);
  };
  
  cb();
};


// trims the index from text that sax-js emits
trimIndent = function(str) {
  var split = str.split('\n'), rs;
  if (split.length > 0 &&
     (rs = /^((?: {3})+|(?: {2})+|(?: {4})+|(?:\t)+)$/m.exec(
        split[split.length - 1]))) {
    //indent = rs[1] || rs[2] || rs[3] || rs[4];

    // check start and end of str
    if (split.shift() !== '') {
      return str;
    }
    split.pop();

    var wholeindent = rs[0] + rs[1];

    // remove indent from beginning of every line
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
};

module.exports = function() {
  var parser = sax.createStream(false, { lowercasetags: true });

  // first start listening for the root tag
  var openf1 = function(node) {
    if (node.name === 'channel' || node.name === 'feed') {
      parser.removeListener('opentag', openf1);
      parser.on('opentag', openf2);
    }
  };
  parser.on('opentag', openf1);

  // after the root is found, start storing the rest of the document
  var root = {};
  var openf2 = function(node) {
    parser.removeListener('opentag', openf2);
    childTag(parser, root, node, cb);
  };

  // after childTag is done, it calls this which listens for another
  // open tag event in the root of the document
  var cb = function(key, value) {
    parser.on('opentag', openf2);
    if (key === 'item' || key === 'entry') {
      // emit to parser when the tag is an item
      parser.emit('item', value);
    } else {
      // emit other tags too
      parser.emit(key, value);
    }
  };

  // called when done parsing the document
  // returns entire document in object form
  parser.done = function() {
    var items;
    if (root.item !== undefined) {
      items = root.item;
      delete root.item;
    } else if (root.entry !== undefined) {
      items = root.entry;
      delete root.entry;
    }
    if (items !== undefined) {
      if (!Array.isArray(items)){
        items = [items];
      }
      root.items = items;
    }
    return root;
  };

  return parser;
};
