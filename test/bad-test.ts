import FeedMe from '..';
import fs     from 'node:fs';
import path   from 'node:path';
import assert from 'node:assert';


describe('Try parsing a non-feed file', () => {
  it('Parser gives an error', (done) => {
    const file = path.join(__dirname, 'assets', 'notfeed.json');
    const parser = new FeedMe();
    parser.on('error', (err) => {
      assert.equal(err.message, 'Not a correctly formatted feed');
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });

  describe('That is disguised as an xml feed', () => {
    it('Parser gives an error', (done) => {
      const file = path.join(__dirname, 'assets', 'notfeed.xml');
      const parser = new FeedMe();
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
    const file = path.join(__dirname, 'assets', 'no-items.xml');
    const parser = new FeedMe(true);
    parser.on('finish', () => {
      assert.equal(parser.done()?.items, 0);
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });
});

describe('Parse a badly formatted feed', () => {
  it('Parser gives an error', (done) => {
    const file = path.join(__dirname, 'assets', 'badfeed.xml');
    const parser = new FeedMe();
    parser.on('error', (err) => {
      assert.ok(/Unexpected end/.test(err.message), `Error message: ${err.message}`);
      done();
    });
    fs.createReadStream(file).pipe(parser);
  });
});
