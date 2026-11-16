import { Writable } from 'node:stream';
import JSONFeedParser from './jsonfeedparser';
import type * as parser from './parser';
import XMLFeedParser from './xmlfeedparser';

const isWhitespaceByte = (byte: number): boolean =>
  byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;

/**
 * Strips leading whitespace and UTF-8 BOMs, reporting when only part of a BOM
 * has arrived so detection can wait for the rest.
 */
const stripLeading = (buf: Buffer): { rest: Buffer; partialBom: boolean } => {
  let i = 0;
  while (i < buf.length) {
    if (isWhitespaceByte(buf[i])) {
      i++;
      continue;
    }
    if (buf[i] === 0xef) {
      if (buf.length - i < 3) {
        return { rest: buf.subarray(i), partialBom: true };
      }
      if (buf[i + 1] === 0xbb && buf[i + 2] === 0xbf) {
        i += 3;
        continue;
      }
    }
    break;
  }
  return { rest: buf.subarray(i), partialBom: false };
};

class FeedMe extends Writable {
  static FeedMe = FeedMe;
  static default = FeedMe;

  private _buffer: boolean;
  private _parser: parser.Parser;
  private _prefix: Buffer[] = [];

  /**
   * Creates an instance of a parser. Parser can be JSON/XML.
   *
   * @param buffer If true, feed will be buffered into memory
   *   and can be retrieved using `parser.done()` on the `end` event.
   */
  constructor(buffer = false) {
    super();
    this._buffer = buffer;
  }

  _proxyEvents() {
    const parserEmit = this._parser.parser.emit;
    this._parser.parser.emit = (
      event: string | symbol,
      ...args: unknown[]
    ): boolean => {
      parserEmit.apply(this._parser.parser, [event, ...args]);
      if (event !== 'error') {
        return this.emit(event, ...args);
      }
      return true;
    };
    this._parser.parser.on('error', this.emit.bind(this, 'error'));
  }

  _write(
    data: Buffer,
    encoding: BufferEncoding,
    callback: (err?: Error | null) => void,
  ) {
    if (this._parser) {
      this._parser.write(data, encoding, callback);
      return;
    }

    // The feed type may not be decidable from the first chunk, such as when
    // leading whitespace or a BOM arrives on its own or is split up.
    this._prefix.push(data);
    const buffered = Buffer.concat(this._prefix);
    const { rest, partialBom } = stripLeading(buffered);
    if (partialBom || rest.length === 0) {
      callback();
      return;
    }

    if (rest[0] === 0x3c) {
      // <
      this._parser = new XMLFeedParser(this._buffer);
    } else if (rest[0] === 0x7b || rest[0] === 0x5b) {
      // { or [
      this._parser = new JSONFeedParser(this._buffer);
      this.emit('type', 'json');
    } else {
      callback(new Error('Not a correctly formatted feed'));
      return;
    }

    this._proxyEvents();
    this._prefix = [];
    this._parser.write(rest, encoding, callback);
  }

  _final(callback: (err?: Error | null) => void) {
    if (this._parser) {
      this._parser.end(callback);
    } else if (Buffer.concat(this._prefix).length) {
      callback(new Error('Not a correctly formatted feed'));
    } else {
      callback(null);
    }
  }

  done() {
    return this._parser.done();
  }
}

namespace FeedMe {
  export type Feed = parser.Feed;
  export type FeedItem = parser.FeedItem;
  export type FeedObject = parser.FeedObject;
  export type Parser = parser.Parser;
}

// Statically recognizable exports for Node.js cjs-module-lexer (ESM named import support)
module.exports = FeedMe;
module.exports.default = FeedMe;
module.exports.FeedMe = FeedMe;

export = FeedMe;
