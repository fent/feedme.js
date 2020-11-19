const { Writable } = require('stream');
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
const cleanObject = (obj) => {
  if (obj.$t !== undefined) {
    let keysLength = Object.keys(obj).length;
    if (keysLength === 1 || (keysLength === 2 && obj.type !== undefined)) {
      return obj.$t;
    } else {
      obj.text = obj.$t;
      delete obj.$t;
    }
  }

  return obj;
};


/**
 * Parses a JSON feed.
 *
 * @param {boolean} buffer If true, will buffer entire object.
 * @return {clarinet.Stream}
 */
module.exports = class JSONFeedParser extends Writable {
  constructor(buffer) {
    super();
    this._buffer = buffer;
    const parser = this.parser = clarinet.createStream();
    const stack = [];
    this._currObj = {};
    this._currKey = 'feed';
    let inArray = false;
    let feedJustFound = false;

    // Look feed object in case this is a json encoded atom feed.
    // Place these underlying keys onto the root object.
    const findfeed = (key) => {
      if (key === 'feed') {
        feedJustFound = true;
        parser.removeListener('openobject', findfeed);
        parser.removeListener('key', findfeed);
      }
    };

    const onvalue = (value) => {
      feedJustFound = false;
      this._currObj[this._currKey] = value;
      if (stack.length === 1) {
        parser.emit(this._currKey, value);
        if (!buffer) { delete this._currObj[this._currKey]; }
      }
      if (inArray) {
        this._currKey++;
      }
    };

    const onopenobject = (key) => {
      if (feedJustFound) {
        feedJustFound = false;
        this._currKey = key;
        return;
      }
      let obj = this._currObj[this._currKey] = {};
      stack.push({
        obj: this._currObj,
        key: this._currKey,
        arr: inArray,
      });
      this._currObj = obj;
      this._currKey = key;
      inArray = false;
    };

    const onkey = (key) => { this._currKey = key; };

    const oncloseobject = () => {
      let parent = stack.pop();
      if (!parent) { return; }
      this._currObj = parent.obj;
      this._currKey = parent.key;
      inArray = parent.arr;

      // Clean object.
      this._currObj[this._currKey] = cleanObject(this._currObj[this._currKey]);

      // Emit key in feed if curr is parent.
      if (stack.length === 1) {
        parser.emit(this._currKey, this._currObj[this._currKey]);
        if (!buffer) { delete this._currObj[this._currKey]; }

        // Or parent is array.
      } else if (inArray) {
        if (stack.length === 2) {
          let key = stack[1].key;
          let event = key === 'entry' || key === 'items' ?
            'item' : stack[1].key;
          let data = this._currObj[this._currKey];
          parser.emit(event, data);
          if (!buffer) { this._currObj.splice(this._currKey, 1); }
        }

        if (stack.length > 2 || buffer) { this._currKey++; }
      }
    };

    const onopenarray = () => {
      feedJustFound = false;
      let obj = this._currObj[this._currKey] = [];
      stack.push({
        obj: this._currObj,
        key: this._currKey,
        arr: inArray,
      });
      this._currObj = obj;
      this._currKey = 0;
      inArray = true;
    };

    const onclosearray = () => {
      let parent = stack.pop();
      this._currObj = parent.obj;
      this._currKey = parent.key;
      inArray = parent.arr;

      if (stack.length === 1) {
        if (!buffer) { delete this._currObj[this._currKey]; }
      } else if (inArray) {
        this._currKey++;
      }
    };

    parser.on('openobject', findfeed);
    parser.on('key', findfeed);
    parser.on('value', onvalue);
    parser.on('openobject', onopenobject);
    parser.on('key', onkey);
    parser.on('closeobject', oncloseobject);
    parser.on('openarray', onopenarray);
    parser.on('closearray', onclosearray);
  }

  _write(chunk, encoding, callback) {
    this.parser.write(chunk, encoding);
    callback(null);
  }

  done() {
    if (!this._buffer) { return; }
    let root = this._currObj[this._currKey];
    root.type = 'json';
    if (Array.isArray(root.entry)) {
      root.items = root.entry;
    }
    delete root.entry;
    return root;
  }
};
