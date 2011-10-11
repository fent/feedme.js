(function() {
  var TEXT_REGEXP, TRIM_REGEXP, childTag, isEmpty, sax, trimIndent, _;
  var __hasProp = Object.prototype.hasOwnProperty;
  sax = require('sax');
  _ = require('underscore');
  isEmpty = function(obj) {
    var key;
    return (obj != null) && 0 === ((function() {
      var _results;
      _results = [];
      for (key in obj) {
        if (!__hasProp.call(obj, key)) continue;
        _results.push(key);
      }
      return _results;
    })()).length;
  };
  TEXT_REGEXP = /\n(( {3})+|( {2})+|( {4})+|(\t)+)$/m;
  childTag = function(parser, parent, node, parentcb) {
    var cb, closef, gottext, obj, openf, property, textf, _ref;
    obj = {};
    if (!isEmpty(node.attributes)) {
      _ref = node.attributes;
      for (property in _ref) {
        if (!__hasProp.call(_ref, property)) continue;
        obj[property] = node.attributes[property];
      }
    }
    gottext = '';
    textf = function(text) {
      var rs;
      rs = TEXT_REGEXP.exec(text);
      if (rs !== null && rs.index === 0 && rs[0] === rs.input) {
        return;
      }
      return gottext += text;
    };
    openf = function(node) {
      if (!gottext) {
        parser.removeListener('text', textf);
      }
      parser.removeListener('cdata', textf);
      parser.removeListener('closetag', closef);
      return childTag(parser, obj, node, cb);
    };
    closef = function(name) {
      if (!gottext) {
        parser.removeListener('text', textf);
      }
      parser.removeListener('cdata', textf);
      parser.removeListener('opentag', openf);
      if (gottext !== '') {
        gottext = trimIndent(gottext);
        if (isEmpty(obj)) {
          obj = gottext;
        } else {
          obj.text = gottext;
        }
      }
      if (parent[node.name] != null) {
        if (!Array.isArray(parent[node.name])) {
          parent[node.name] = [parent[node.name]];
        }
        parent[node.name].push(obj);
      } else {
        parent[node.name] = obj;
      }
      return parentcb(node.name, obj);
    };
    cb = function() {
      if (!gottext) {
        parser.once('text', textf);
      }
      parser.on('cdata', textf);
      parser.once('opentag', openf);
      return parser.once('closetag', closef);
    };
    return cb();
  };
  TRIM_REGEXP = /^( {3})+|( {2})+|( {4})+|(\t)+$/m;
  trimIndent = function(str) {
    var i, indent, rs, s, split, wholeindent, _len;
    split = str.split('\n');
    if (split.length && (rs = TRIM_REGEXP.exec(split[split.length - 1]))) {
      indent = rs[1] || rs[2] || rs[3] || rs[4];
      if (split.shift() !== '') {
        return str;
      }
      split.pop();
      wholeindent = rs[0] + indent;
      for (i = 0, _len = split.length; i < _len; i++) {
        s = split[i];
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
    var cb, openf1, openf2, parser, root;
    parser = sax.createStream(false, {
      lowercasetags: true
    });
    openf1 = function(node) {
      if (node.name === 'channel' || node.name === 'feed') {
        parser.removeListener('opentag', openf1);
        return parser.on('opentag', openf2);
      }
    };
    parser.on('opentag', openf1);
    root = {};
    openf2 = function(node) {
      parser.removeListener('opentag', openf2);
      return childTag(parser, root, node, cb);
    };
    cb = function(key, value) {
      parser.on('opentag', openf2);
      if (key === 'item' || key === 'entry') {
        return parser.emit('item', value);
      } else {
        return parser.emit(key, value);
      }
    };
    parser.done = function() {
      var items;
      if (root.item != null) {
        items = root.item;
        delete root.item;
      } else if (root.entry != null) {
        items = root.entry;
        delete root.entry;
      }
      if (items) {
        if (!Array.isArray(items)) {
          items = [items];
        }
        root.items = items;
      }
      return root;
    };
    return parser;
  };
}).call(this);
