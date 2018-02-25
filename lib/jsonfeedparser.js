const clarinet = require('clarinet');

/**
 * Gets rid of unnecessary keys in an object
 * and if the only keys in an object are `$t` or `$t` and `type`
 * it makes the whole object the value of `$t`
 * otherwise it renames `$t` to `text` for consistency.
 *
 * @param {Object}
 * @returns {Object}
 */
function cleanObject(obj) {
  if (obj.$t !== undefined) {
    var keysLength = Object.keys(obj).length;
    if (keysLength === 1 || (keysLength === 2 && obj.type !== undefined)) {
      return obj.$t;
    } else {
      obj.text = obj.$t;
      delete obj.$t;
    }
  }

  return obj;
}


/**
 * Parses a JSON feed.
 *
 * @param {Boolean} buffer If true, will buffer entire object.
 * @return {clarinet.Stream}
 */
module.exports = (buffer) => {
  var parser = clarinet.createStream();
  var stack = [];
  var currObj = {};
  var currKey = 'feed';
  var inArray = false;
  var feedJustFound = false;

  // Look feed object in case this is a json encoded atom feed.
  // Place these underlying keys onto the root object.
  function findfeed(key) {
    if (key === 'feed') {
      feedJustFound = true;
      parser.removeListener('openobject', findfeed);
      parser.removeListener('key', findfeed);
    }
  }

  parser.on('openobject', findfeed);
  parser.on('key', findfeed);
  parser.on('value', onvalue);
  parser.on('openobject', onopenobject);
  parser.on('key', onkey);
  parser.on('closeobject', oncloseobject);
  parser.on('openarray', onopenarray);
  parser.on('closearray', onclosearray);

  function onvalue(value) {
    feedJustFound = false;
    currObj[currKey] = value;
    if (stack.length === 1) {
      parser.emit(currKey, value);
      if (!buffer) { delete currObj[currKey]; }
    }
    if (inArray) {
      currKey++;
    }
  }

  function onopenobject(key) {
    if (feedJustFound) {
      feedJustFound = false;
      currKey = key;
      return;
    }
    var obj = currObj[currKey] = {};
    stack.push({
      obj: currObj,
      key: currKey,
      arr: inArray,
    });
    currObj = obj;
    currKey = key;
    inArray = false;
  }

  function onkey(key) {
    currKey = key;
  }

  function oncloseobject() {
    var parent = stack.pop();
    if (!parent) { return; }
    currObj = parent.obj;
    currKey = parent.key;
    inArray = parent.arr;

    // Clean object.
    currObj[currKey] = cleanObject(currObj[currKey]);

    // Emit key in feed if curr is parent.
    if (stack.length === 1) {
      parser.emit(currKey, currObj[currKey]);
      if (!buffer) { delete currObj[currKey]; }

    // Or parent is array.
    } else if (inArray) {
      if (stack.length === 2) {
        var key = stack[1].key;
        var event = key === 'entry' || key === 'items' ?
          'item' : stack[1].key;
        parser.emit(event, currObj[currKey]);
        if (!buffer) { currObj.splice(currKey, 1); }
      }

      if (stack.length > 2 || buffer) { currKey++; }
    }
  }

  function onopenarray() {
    feedJustFound = false;
    var obj = currObj[currKey] = [];
    stack.push({
      obj: currObj,
      key: currKey,
      arr: inArray,
    });
    currObj = obj;
    currKey = 0;
    inArray = true;
  }

  function onclosearray() {
    var parent = stack.pop();
    currObj = parent.obj;
    currKey = parent.key;
    inArray = parent.arr;

    if (stack.length === 1) {
      if (!buffer) { delete currObj[currKey]; }
    } else if (inArray) {
      currKey++;
    }
  }

  parser.done = () => {
    if (!buffer) { return; }
    var root = currObj[currKey];
    root.type = 'json';
    if (Array.isArray(root.entry)) {
      root.items = root.entry;
    }
    delete root.entry;
    return root;
  };

  return parser;
};
