import FeedMe from '..';
import fs     from 'fs';
import path   from 'path';
import assert from 'assert';


const file = path.join(__dirname, 'assets', 'jsonfeed.json');

describe('End a stream early', () => {
  describe('With data written', () => {
    it('Items are emitted', (done) => {
      const parser = new FeedMe();
      parser.on('item', () => {
        done();
      });
      fs.readFile(file, (err, body) => {
        assert.ifError(err);
        parser.end(body);
      });
    });
  });

  describe('With nothing written', () => {
    it('Everything goes well', (done) => {
      const parser = new FeedMe();
      parser.on('finish', done);
      parser.on('item', () => {
        throw Error('There should be no items');
      });
      parser.end();
    });
  });
});
