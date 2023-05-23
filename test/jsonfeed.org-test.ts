import FeedMe from '..';
import fs     from 'node:fs';
import path   from 'path';
import assert from 'assert';


const file = path.join(__dirname, 'assets', 'jsonfeed.org.json');
const feed = require(file);
feed.type = 'json';

describe('Parse a jsonfeed.org feed file', () => {
  it('Events emitted match expected', (done) => {
    const parser = new FeedMe();
    let events = 0;
    let items = 0;

    parser.on('type', (data) => {
      assert.deepEqual(data, feed.type);
      events++;
    });

    parser.on('title', (data) => {
      assert.deepEqual(data, feed.title);
      events++;
    });

    parser.on('feed_url', (data) => {
      assert.deepEqual(data, feed.feed_url);
      events++;
    });

    parser.on('homepage_url', (data) => {
      assert.deepEqual(data, feed.homepage_url);
      events++;
    });

    parser.on('author', (data) => {
      assert.deepEqual(data, feed.author);
      events++;
    });

    parser.on('item', (data) => {
      assert.deepEqual(data.title, feed.items[items].title);
      assert.deepEqual(data.url, feed.items[items].url);
      assert.deepEqual(data.id, feed.items[items].id);
      assert.deepEqual(data.date_modified, feed.items[items].date_modified);
      assert.deepEqual(data.author, feed.items[items].author);
      assert.deepEqual(data.date_published, feed.items[items].date_published);
      assert.deepEqual(data.content_html, feed.items[items].content_html);
      assert.deepEqual(data, feed.items[items]);
      items++;
    });

    fs.createReadStream(file).pipe(parser);
    parser.on('finish', () => {
      assert.equal(events, 4);
      assert.equal(items, 48);
      assert.deepEqual(parser.done(), undefined);
      done();
    });
  });

  describe('with buffer on', () => {
    it('Returns matching Javascript object', (done) => {
      const parser = new FeedMe(true);
      fs.createReadStream(file).pipe(parser);

      parser.on('finish', () => {
        assert.deepEqual(parser.done(), feed);
        done();
      });
    });
  });

});
