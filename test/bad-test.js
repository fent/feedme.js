var FeedMe = require('..');
var fs     = require('fs');
var path   = require('path');
var assert = require('assert');


describe('Try parsing a non-feed file', function() {
  it('Parser gives an error', function(done) {
    var file = path.join(__dirname, 'assets', 'notfeed.json');
    var parser = new FeedMe();
    parser.on('error', function(err) {
      assert.equal(err.message, 'Not a correctly formatted feed');
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });

  describe('That is disguised as an xml feed', function() {
    it('Parser gives an error', function(done) {
      var file = path.join(__dirname, 'assets', 'notfeed.xml');
      var parser = new FeedMe();
      parser.on('error', function(err) {
        assert.equal(err.message, 'Feed type not recognized');
        done();
      });
      fs.createReadStream(file).pipe(parser);
    });
  });
});

describe('Parse a feed with no items', function() {
  it('Parser gives no items', function(done) {
    var file = path.join(__dirname, 'assets', 'no-items.xml');
    var parser = new FeedMe(true);
    parser.on('end', function() {
      assert.equal(parser.done().items, 0);
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });
});
