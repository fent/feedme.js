var clarinet = require('clarinet');


var child = function(parser, cb, root) {
  // remove listeners when any event is emitted
  var removeListeners = function() {
    parser.removeListener('openobject', openobject);
    parser.removeListener('openarray', openarray);
    parser.removeListener('closearray', closearray);
    parser.removeListener('value', value);
  };

  var openobject = function(key) {
    removeListeners();
    onObject(parser, key, cb);
  };

  var openarray = function() {
    removeListeners();
    onArray(parser, cb, root);
  };

  // if this is called, then child was called from onArray
  var closearray = function() {
    removeListeners();
    cb();
  };

  var value = function(value) {
    removeListeners();
    cb(value);
  }

  // start listening for possible values
  parser.on('openobject', openobject);
  parser.on('openarray', openarray);
  parser.on('closearray', closearray);
  parser.on('value', value);
};


var onObject = function(parser, key, cb) {
  // remove listeners when there is a key or object is closed
  var removeListeners = function() {
    parser.removeListener('key', getKey);
    parser.removeListener('closeobject', closeobject);
  };

  var obj = {};

  var getKey = function(key) {
    removeListeners();

    child(parser, function(value) {
      obj[key] = value;
      parser.on('key', getKey);
      parser.on('closeobject', closeobject);
    });
  };

  var closeobject = function() {
    removeListeners();
    cb(cleanObject(obj));
  };

  if (key !== undefined) {
    getKey(key);
  } else {
    cb(cleanObject(obj));
  }
};


// gets rid of unnecessary keys in an object
// and if the only keys in an object are `$t` or `$t` and `type`
// it makes the whole object the value of `$t`
// otherwise it renames `$t` to `text` for consistency
var cleanObject = function(obj) {
  var keysLength = Object.keys(obj).length;

  if (obj.$t !== undefined) {
    if (keysLength === 1 || (keysLength === 2 && obj.type !== undefined)) {
      return obj.$t;
    } else {
      obj.text = obj.$t;
      delete obj.$t;
    }
  }

  return obj;
};


var onArray = function(parser, cb, root) {
  var arr = [];
  
  // call child one array value at a time
  var getChild = function(value) {
    child(parser, function(value) {
      if (value !== undefined) {
        
        // if this array is on root feed object, emit it
        if (root !== undefined) {
          parser.emit(root === 'entry' ? 'item' : root, value);
        }
        arr.push(value);
        getChild();

      // if value is undefined, array was closed
      } else {
        cb(arr);
      }
    });
  };
  getChild();
};


module.exports = function() {
  var parser = clarinet.createStream();
  var root = { type: 'json' };

  // first find the feed object
  var findFeed = function(key) {
    if (key === 'feed') {
      parser.removeListener('openobject', findFeed);
      parser.removeListener('key', findFeed);
      parser.on('openobject', onKey);
      parser.on('key', onKey);
    }
  };

  parser.on('openobject', findFeed);
  parser.on('key', findFeed);


  // then start reading keys
  var onKey = function(key) {
    parser.removeListener('openobject', onKey);
    parser.removeListener('key', onKey);

    child(parser, function(value) {
      if (!Array.isArray(value)) {
        parser.emit(key, value);
      }
      root[key] = value;
      parser.on('key', onKey);

    }, key);
  };


  parser.done = function() {
    if (root.entry !== undefined) {
      root.items = root.entry;
      delete root.entry;
    }

    return root;
  }

  return parser;
};
