import { Writable } from 'stream';
import { default as clarinet } from 'clarinet';
import { Parser, Feed } from './parser';


type JSONValue = string | boolean | null;
type JSONObject = {
  [key: string]: JSONValue | JSONObject | JSONObject[];
}
type JSONArray = JSONObject[];
type JSONAny = JSONObject | JSONArray;
type JSONRoot = JSONObject & {
  type: string;
  items: JSONObject[];
}


/**
 * Gets rid of unnecessary keys in an object
 * and if the only keys in an object are `$t` or `$t` and `type`
 * it makes the whole object the value of `$t`
 * otherwise it renames `$t` to `text` for consistency.
 *
 * @param {Object}
 * @returns {Object}
 */
const cleanObject = (obj: JSONObject) => {
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
 * @return {CStream}
 */
export default class JSONFeedParser extends Writable implements Parser {
  _buffer: boolean;
  parser: Writable;
  private _currObj: JSONAny;
  private _currKey: string | number;

  constructor(buffer: boolean) {
    super();
    this._buffer = buffer;
    const parser = this.parser = clarinet.createStream() as unknown as Writable;
    type StackItem = {
      obj: JSONAny;
      key: string | number;
      arr: boolean;
    }
    const stack: StackItem[] = [];
    this._currObj = {};
    this._currKey = 'feed';
    let inArray = false;
    let feedJustFound = false;

    // Look feed object in case this is a json encoded atom feed.
    // Place these underlying keys onto the root object.
    const findfeed = (key: string) => {
      if (key === 'feed') {
        feedJustFound = true;
        parser.removeListener('openobject', findfeed);
        parser.removeListener('key', findfeed);
      }
    };

    const onvalue = (value: JSONValue) => {
      feedJustFound = false;
      (this._currObj as JSONObject)[this._currKey] = value;
      if (stack.length === 1) {
        parser.emit(this._currKey as string, value);
        if (!buffer) { delete (this._currObj as JSONObject)[this._currKey as string]; }
      }
      if (inArray) {
        (this._currKey as number)++;
      }
    };

    const onopenobject = (key: string) => {
      if (feedJustFound) {
        feedJustFound = false;
        this._currKey = key;
        return;
      }
      let obj = (this._currObj as JSONObject)[this._currKey] = {};
      stack.push({
        obj: this._currObj,
        key: this._currKey,
        arr: inArray,
      });
      this._currObj = obj;
      this._currKey = key;
      inArray = false;
    };

    const onkey = (key: string) => { this._currKey = key; };

    const oncloseobject = () => {
      let parent = stack.pop();
      if (!parent) { return; }
      this._currObj = parent.obj;
      this._currKey = parent.key;
      inArray = parent.arr;

      // Clean object.
      const currObj = this._currObj as JSONObject;
      currObj[this._currKey] = cleanObject(currObj[this._currKey] as JSONObject);

      // Emit key in feed if curr is parent.
      if (stack.length === 1) {
        parser.emit(`${this._currKey}`, currObj[this._currKey]);
        if (!buffer) { delete currObj[this._currKey]; }

        // Or parent is array.
      } else if (inArray) {
        const currArr = currObj as unknown as JSONArray;
        if (stack.length === 2) {
          let key = stack[1].key;
          let event = key === 'entry' || key === 'items' ?
            'item' : stack[1].key as string;
          let data = currArr[this._currKey as number];
          parser.emit(event, data);
          if (!buffer) { currArr.splice(this._currKey as number, 1); }
        }

        if (stack.length > 2 || buffer) { (this._currKey as number)++; }
      }
    };

    const onopenarray = () => {
      feedJustFound = false;
      let obj: JSONAny = (this._currObj as JSONObject)[this._currKey] = [];
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
      let parent = stack.pop() as StackItem;
      this._currObj = parent.obj;
      this._currKey = parent.key;
      inArray = parent.arr;

      if (stack.length === 1) {
        if (!buffer) { delete (this._currObj as JSONObject)[this._currKey]; }
      } else if (inArray) {
        (this._currKey as number)++;
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

  _write(chunk: Buffer, encoding: BufferEncoding, callback: (err?: Error | null) => void) {
    this.parser.write(chunk, encoding);
    callback(null);
  }

  _final(callback: (err?: Error | null) => void) {
    this.parser.end();
    callback(null);
  }

  done() {
    if (!this._buffer) { return; }
    let root = (this._currObj as JSONObject)[this._currKey] as JSONRoot;
    root.type = 'json';
    if (Array.isArray(root.entry)) {
      root.items = root.entry;
    }
    delete root.entry;
    return root as Feed;
  }
}
