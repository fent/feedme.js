const { Writable } = require('stream');
const XMLFeedParser  = require('./xmlfeedparser');
const JSONFeedParser = require('./jsonfeedparser');


module.exports = class FeedMe extends Writable {
  /**
   * Creates an instance of a parser. Parser can be JSON/XML.
   *
   * @param {boolean} buffer If true, feed will be buffered into memory
   *   and can be retrieved using `parser.done()` on the `end` event.
   * @constructor
   */
  constructor(buffer) {
    super();
    this._buffer = buffer;
    this._parser = null;
  }

  _proxyEvents() {
    const parserEmit = this._parser.parser.emit;
    this._parser.parser.emit = (event, value) => {
      parserEmit.call(this._parser.parser, event, value);
      if (event !== 'error') {
        this.emit(event, value);
      }
    };
    this._parser.parser.on('error', this.emit.bind(this, 'error'));
  }

  /**
   * @param {Buffer} data
   */
  _write(data, encoding, callback) {
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

  _final(callback) {
    if (this._parser) {
      this._parser.end(callback);
    } else {
      callback(null);
    }
  }

  done() {
    return this._parser.done();
  }
};
