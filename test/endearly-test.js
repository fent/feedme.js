var FeedMe = require('..');
var fs     = require('fs');
var path   = require('path');


var file = path.join(__dirname, 'assets', 'jsonfeed.json');

describe('End a stream early', function() {
  describe('With data written', function() {
    it('Items are emitted', function(done) {
      var parser = new FeedMe();
      parser.on('item', function() {
        done();
      });
      fs.readFile(file, function(err, body) {
        if (err) return done(err);
        parser.end(body);
      });
    });
  });

  describe('With nothing written', function() {
    it('Everything goes well', function(done) {
      var parser = new FeedMe();
      parser.on('end', done);
      parser.on('item', function() {
        throw new Error('There should be no items');
      });
      parser.end();
    });
  });
});
