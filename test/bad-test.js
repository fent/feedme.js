const FeedMe = require('..');
const fs     = require('fs');
const path   = require('path');
const assert = require('assert');


describe('Try parsing a non-feed file', () => {
  it('Parser gives an error', (done) => {
    var file = path.join(__dirname, 'assets', 'notfeed.json');
    var parser = new FeedMe();
    parser.on('error', (err) => {
      assert.equal(err.message, 'Not a correctly formatted feed');
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });

  describe('That is disguised as an xml feed', () => {
    it('Parser gives an error', (done) => {
      var file = path.join(__dirname, 'assets', 'notfeed.xml');
      var parser = new FeedMe();
      parser.on('error', (err) => {
        assert.equal(err.message, 'Feed type not recognized');
        done();
      });
      fs.createReadStream(file).pipe(parser);
    });
  });
});

describe('Parse a feed with no items', () => {
  it('Parser gives no items', (done) => {
    var file = path.join(__dirname, 'assets', 'no-items.xml');
    var parser = new FeedMe(true);
    parser.on('end', () => {
      assert.equal(parser.done().items, 0);
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });
});
