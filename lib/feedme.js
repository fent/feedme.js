var EventYoshi = require('eventyoshi');
var XMLFeedParser = require('./xmlfeedparser');
var JSONFeedParser = require('./jsonfeedparser');


/**
 * Creates an instance of a parser. Parser can be JSON/XML.
 *
 * @param (Boolean) buffer If true, feed will be buffered into memory
 *   and can be retrieved using `parser.end()` on end.
 * @returns (Stream)
 */
module.exports = function(buffer) {
  var yoshi = new EventYoshi();
  var parser;

  // Make yoshi behave stream like.
  yoshi.writable = true;

  // First find out what type of feed this is.
  yoshi.write = function(data) {
    var str = data.toString();
    var startParsing = false;

    if (/^\s*</.test(str)) {
      startParsing = true;
      parser = XMLFeedParser(buffer);

    } else if (/^\s*[\{\[]/.test(str)) {
      startParsing = true;
      parser = JSONFeedParser(buffer);
      yoshi.emit('type', 'json');

    } else {
      yoshi.emit('error', new Error('Not a correctly formatted feed'));
    }

    if (startParsing) {
      yoshi.add(parser);
      yoshi.proxy('write', 'end', 'done', 'close');
      parser.write(data);
    }

  };

  // In case `end()` is called right away.
  yoshi.end = function(data) {
    if (data && data.length) {
      yoshi.write(data);
    } else {
      yoshi.emit('end');
    }
  };

  return yoshi;
};
