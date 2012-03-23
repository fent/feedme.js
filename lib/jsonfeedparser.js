var clarinet = require('clarinet');

/**
 * Gets rid of unnecessary keys in an object
 * and if the only keys in an object are `$t` or `$t` and `type`
 * it makes the whole object the value of `$t`
 * otherwise it renames `$t` to `text` for consistency.
 * @param (Object)
 * @returns (Object)
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
 * @param (boolean) buffer If true, will buffer entire object.
 * @return (clarinet.Stream)
 */
module.exports = function(buffer) {
  var parser = clarinet.createStream();

  // first find the feed object
  function findfeed(key) {
    if (key === 'feed') {
      parser.removeListener('openobject', findfeed);
      parser.removeListener('key', findfeed);
      parser.on('value', onvalue);
      parser.on('openobject', onopenobject);
      parser.on('key', onkey);
      parser.on('closeobject', oncloseobject);
      parser.on('openarray', onopenarray);
      parser.on('closearray', onclosearray);
    }
  };

  parser.on('openobject', findfeed);
  parser.on('key', findfeed);

  var stack = []
    , currObj = {}
    , currKey = 'feed'
    , inArray
    ;

  function onvalue(value) {
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
    var obj = currObj[currKey] = {};
    stack.push({
      obj: currObj
    , key: currKey
    , arr: inArray
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

    // clean object
    currObj[currKey] = cleanObject(currObj[currKey]);

    // emit key in feed if curr is parent
    if (stack.length === 1) {
      parser.emit(currKey, currObj[currKey]);
      if (!buffer) { delete currObj[currKey]; }

    // or parent is array
    } else if (inArray) {
      if (stack.length === 2) {
        var event = stack[1].key === 'entry' ? 'item' : stack[1].key;
        parser.emit(event, currObj[currKey]);
        if (!buffer) { currObj.splice(currKey, 1); }
      }

      if (stack.length > 2 || buffer) { currKey++; }
    }
  }

  function onopenarray() {
    var obj = currObj[currKey] = [];
    stack.push({
      obj: currObj
    , key: currKey
    , arr: inArray
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

  parser.done = function() {
    if (!buffer) return;
    root = currObj[currKey];
    root.type = 'json';
    if (root && root.entry !== undefined) {
      root.items = root.entry;
      delete root.entry;
    }

    return root;
  }

  return parser;
};
