import { default as FeedMe, Feed } from '..';
import fs     from 'node:fs';
import path   from 'node:path';
import assert from 'node:assert';


const file1 = path.join(__dirname, 'assets', 'rdf.xml');
const feed = {
  type: 'rss 1.0',
  title: 'Pinboard (items tagged hardware)',
  link: 'https://pinboard.in/t:hardware/',
  description: '',
};


describe('Parse an RSS file with RDF schema', () => {
  it('Matches JSON object', (done) => {
    const parser = new FeedMe();
    let events = 0;
    let items = 0;

    parser.on('type', (data) => {
      assert.deepEqual(data, feed.type);
      events++;
    });

    parser.on('title', (data) => {
      assert.equal(data, feed.title);
      events++;
    });

    parser.on('link', (data) => {
      assert.equal(data, feed.link);
      events++;
    });

    parser.on('description', (data) => {
      assert.equal(data, feed.description);
      events++;
    });

    parser.on('item', () => {
      items++;
    });

    fs.createReadStream(file1).pipe(parser);
    parser.on('finish', () => {
      assert.equal(events, 4);
      assert.equal(items, 70);
      assert.deepEqual(parser.done(), undefined);
      done();
    });
  });

  describe('with buffer on', () => {
    it('Returns matching Javascript object', (done) => {
      const parser = new FeedMe(true);
      fs.createReadStream(file1).pipe(parser);
      parser.on('finish', () => {
        const doc = parser.done() as Feed;
        assert.equal(doc.type, feed.type);
        assert.equal(doc.title, feed.title);
        assert.equal(doc.link, feed.link);
        assert.equal(doc.description, feed.description);
        assert.equal(doc.items.length, 70);
        done();
      });
    });
  });

});
