var EventYoshi = require('eventyoshi')
  , XMLFeedParser = require('./xmlfeedparser')
  , JSONFeedParser = require('./jsonfeedparser')


module.exports = function() {
  var yoshi = new EventYoshi()
    , parser

  // make yoshi behave stream like
  yoshi.writable = true;

  // first find out what type of feed this is
  yoshi.write = function(data) {
    var str = data.toString();
    var startParsing = false;

    if (/^\s*</.test(str)) {
      startParsing = true;
      parser = XMLFeedParser();

    } else if (/^\s*{/.test(str)) {
      startParsing = true;
      parser = JSONFeedParser();
      yoshi.emit('type', 'json');

    } else {
      yoshi.emit('error', new Error('Not a correctly formatted feed'));
    }

    if (startParsing) {
      yoshi.add(parser);
      yoshi.proxy('write', 'end', 'done');
      parser.write(data);
    }

  };

  return yoshi;
};
