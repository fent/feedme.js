var FeedMe = require('..');
var fs     = require('fs');
var path   = require('path');
var assert = require('assert');


var file = path.join(__dirname, 'assets', 'atom.xml');
var feed = {
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


describe('Parse an Atom file', function() {
  var parser = new FeedMe();
  var events = 0;

  it('Events emitted match expected', function(done) {

    parser.on('type', function(data) {
      assert.deepEqual(data, feed.type);
      events++;
    });

    parser.on('title', function(data) {
      assert.deepEqual(data, feed.title);
      events++;
    });

    parser.on('subtitle', function(data) {
      assert.deepEqual(data, feed.subtitle);
      events++;
    });

    parser.on('updated', function(data) {
      assert.equal(data, feed.updated);
      events++;
    });

    parser.on('id', function(data) {
      assert.equal(data, feed.id);
      events++;
    });

    parser.once('link', function(data) {
      assert.deepEqual(data, feed.link[0]);
      events++;

      parser.once('link', function(data) {
        assert.deepEqual(data, feed.link[1]);
        events++;
      });
    });

    parser.on('rights', function(data) {
      assert.equal(data, feed.rights);
      events++;
    });

    parser.on('generator', function(data) {
      assert.deepEqual(data, feed.generator);
      events++;
    });

    parser.on('item', function(data) {
      assert.deepEqual(data.title, feed.items[0].title);
      assert.deepEqual(data.link, feed.items[0].link);
      assert.deepEqual(data.id, feed.items[0].id);
      assert.deepEqual(data.updated, feed.items[0].updated);
      assert.deepEqual(data.author, feed.items[0].author);
      assert.deepEqual(data.contributor, feed.items[0].contributor);
      assert.deepEqual(data.content, feed.items[0].content);
      assert.deepEqual(data, feed.items[0]);
      events++;
    });

    fs.createReadStream(file).pipe(parser);

    parser.on('end', done);
  });

  after(function() {
    assert.equal(events, 10);
    assert.deepEqual(parser.done(), undefined);
  });

  describe('with buffer on', function() {
    var parser = new FeedMe(true);

    it('Returns matching Javascript object', function(done) {
      fs.createReadStream(file).pipe(parser);

      parser.on('end', function() {
        assert.deepEqual(parser.done(), feed);
        done();
      });
    });
  });

});
