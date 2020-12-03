import { Writable } from 'stream';
import { Parser } from './parser';
import XMLFeedParser from './xmlfeedparser';
import JSONFeedParser from './jsonfeedparser';


class FeedMeClass extends Writable {
  private _buffer: boolean;
  private _parser: Parser;

  /**
   * Creates an instance of a parser. Parser can be JSON/XML.
   *
   * @param {boolean} buffer If true, feed will be buffered into memory
   *   and can be retrieved using `parser.done()` on the `end` event.
   * @constructor
   */
  constructor(buffer = false) {
    super();
    this._buffer = buffer;
    this._parser = null;
  }

  _proxyEvents() {
    const parserEmit = this._parser.parser.emit;
    this._parser.parser.emit = (event: string | symbol, ...args: any[]): boolean => {
      parserEmit.apply(this._parser.parser, [event, ...args]);
      if (event !== 'error') {
        return this.emit(event, ...args);
      }
      return true;
    };
    this._parser.parser.on('error', this.emit.bind(this, 'error'));
  }

  /**
   * @param {Buffer} data
   */
  _write(data: Buffer, encoding: BufferEncoding, callback: (err?: Error) => void) {
    const str = data.toString();

    // First find out what type of feed this is.
    if (!this._parser) {
      if (/^\s*</.test(str)) {
        this._parser = new XMLFeedParser(this._buffer);
        this._proxyEvents();

      } else if (/^\s*[{[]/.test(str)) {
        this._parser = new JSONFeedParser(this._buffer);
        this.emit('type', 'json');
        this._proxyEvents();

      } else {
        callback(new Error('Not a correctly formatted feed'));
        return;
      }
    }

    this._parser.write(data, encoding, callback);
  }

  _final(callback: (err?: Error) => void) {
    if (this._parser) {
      this._parser.end(callback);
    } else {
      callback(null);
    }
  }

  done() {
    return this._parser.done();
  }
}


export const FeedMe = FeedMeClass;
export default FeedMe;
module.exports = FeedMe;
