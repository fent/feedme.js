const EventYoshi     = require('eventyoshi');
const XMLFeedParser  = require('./xmlfeedparser');
const JSONFeedParser = require('./jsonfeedparser');


module.exports = class FeedMe extends EventYoshi {
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

    // Make yoshi behave stream like.
    this.writable = true;
  }

  /**
   * @param {Buffer} data
   */
  write(data) {
    const str = data.toString();

    // First find out what type of feed this is.
    if (/^\s*</.test(str)) {
      this._parser = XMLFeedParser(this._buffer);

    } else if (/^\s*[{[]/.test(str)) {
      this._parser = JSONFeedParser(this._buffer);
      this.emit('type', 'json');

    } else {
      this.emit('error', new Error('Not a correctly formatted feed'));
    }

    if (this._parser) {
      this.add(this._parser);
      this.proxy('write', 'end', 'done', 'close');
      this._parser.write(data);
    }

  }

  /**
   * @param {!Buffer} data
   */
  end(data) {
    if (data && data.length) {
      this.write(data);
    } else {
      this.emit('end');
    }
  }
};
