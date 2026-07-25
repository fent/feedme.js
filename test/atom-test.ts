import FeedMe from '..';
import fs     from 'fs';
import path   from 'path';
import assert from 'assert';


const file = path.join(__dirname, 'assets', 'atom.xml');
const feed = {
  type: 'atom',
  title: 'dive into mark',
  subtitle: 'A <em>lot</em> of effort\nwent into making this effortless',
  updated: '2005-07-31T12:29:29Z',
  id: 'tag:example.org,2003:3',
  link: [
    {
      rel: 'alternate',
      type: 'text/html',
      hreflang: 'en',
      href: 'http://example.org/'
    },
    {
      rel: 'self',
      type: 'application/atom+xml',
      href: 'http://example.org/feed.atom'
    }
  ],
  rights: 'Copyright (c) 2003, Mark Pilgrim',
  generator: {
    uri: 'http://www.example.com/',
    version: '1.0',
    text: 'Example Toolkit'
  },
  items: [
    {
      title: 'Atom draft-07 snapshot',
      link: [
        {
          rel: 'alternate',
          type: 'text/html',
          href: 'http://example.org/2005/04/02/atom'
        },
        {
          rel: 'enclosure',
          type: 'audio/mpeg',
          length: '1337',
          href: 'http://example.org/audio/ph34r_my_podcast.mp3'
        }
      ],
      id: 'tag:example.org,2003:3.2397',
      updated: '2005-07-31T12:29:29Z',
      published: '2003-12-13T08:29:29-04:00',
      author: {
        name: 'Mark Pilgrim',
        uri: 'http://example.org/',
        email: 'f8dy@example.com'
      },
      contributor: [
        {
          name: 'Sam Ruby',
          desc: '\n        Bad\n       indents\n      '
        },
        {
          name: 'Joe Gregorio',
          desc: 'A bad\n        indent\n      '
        },
      ],
      content: {
        type: 'xhtml',
        'xml:lang': 'en',
        'xml:base': 'http://diveintomark.org/',
        div: {
          xmlns: 'http://www.w3.org/1999/xhtml',
          p: {
            i: '[Update: The Atom draft is finished.]'
          }
        }
      }
    }
  ]
};


describe('Parse an Atom file', () => {
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

    parser.on('subtitle', (data) => {
      assert.deepEqual(data, feed.subtitle);
      events++;
    });

    parser.on('updated', (data) => {
      assert.equal(data, feed.updated);
      events++;
    });

    parser.on('id', (data) => {
      assert.equal(data, feed.id);
      events++;
    });

    parser.once('link', (data) => {
      assert.deepEqual(data, feed.link[0]);
      events++;

      parser.once('link', (data) => {
        assert.deepEqual(data, feed.link[1]);
        events++;
      });
    });

    parser.on('rights', (data) => {
      assert.equal(data, feed.rights);
      events++;
    });

    parser.on('generator', (data) => {
      assert.deepEqual(data, feed.generator);
      events++;
    });

    parser.on('item', (data) => {
      assert.deepEqual(data.title, feed.items[items].title);
      assert.deepEqual(data.link, feed.items[items].link);
      assert.deepEqual(data.id, feed.items[items].id);
      assert.deepEqual(data.updated, feed.items[items].updated);
      assert.deepEqual(data.author, feed.items[items].author);
      assert.deepEqual(data.contributor, feed.items[items].contributor);
      assert.deepEqual(data.content, feed.items[items].content);
      assert.deepEqual(data, feed.items[items]);
      items++;
    });

    fs.createReadStream(file).pipe(parser);

    parser.on('finish', () => {
      assert.equal(events, 9);
      assert.equal(items, 1);
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

describe('Parse empty Atom text elements', () => {
  it('emits an empty string for a typed empty summary', (done) => {
    const parser = new FeedMe();
    let summary: unknown;
    const xml = `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Test feed</title>
        <id>urn:test</id>
        <updated>2026-07-25T00:00:00Z</updated>
        <entry>
          <title>Empty summary</title>
          <id>urn:empty</id>
          <updated>2026-07-25T00:00:00Z</updated>
          <summary type="text"></summary>
        </entry>
      </feed>`;

    parser.on('item', (item) => {
      summary = item.summary;
    });
    parser.on('finish', () => {
      assert.equal(summary, '');
      done();
    });

    parser.end(xml);
  });
});
