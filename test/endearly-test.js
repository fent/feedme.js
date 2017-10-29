const FeedMe = require('..');
const fs     = require('fs');
const path   = require('path');


const file = path.join(__dirname, 'assets', 'jsonfeed.json');

describe('End a stream early', () => {
  describe('With data written', () => {
    it('Items are emitted', (done) => {
      var parser = new FeedMe();
      parser.on('item', () => {
        done();
      });
      fs.readFile(file, (err, body) => {
        if (err) return done(err);
        parser.end(body);
      });
    });
  });

  describe('With nothing written', () => {
    it('Everything goes well', (done) => {
      var parser = new FeedMe();
      parser.on('end', done);
      parser.on('item', () => {
        throw new Error('There should be no items');
      });
      parser.end();
    });
  });
});
