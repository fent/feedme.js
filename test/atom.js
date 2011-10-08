var FeedMe = require('../lib/feedme'),
      fs = require('fs');


exports['Parse an Atom file'] = function(beforeExit, assert) {
  var parser = new FeedMe(),
      events = 0;

  parser.on('title', function(data) {
    assert.deepEqual(data, {
      $attr: { type: 'text' },
      $text: 'dive into mark'
    });
    events++;
  });

  parser.on('subtitle', function(data) {
    assert.deepEqual(data, {
      $attr: { type: 'html' },
      $text: 'A <em>lot</em> of effort\nwent into making this effortless'
    });
    events++;
  });

  parser.on('updated', function(data) {
    assert.equal(data, '2005-07-31T12:29:29Z');
    events++;
  });

  parser.on('id', function(data) {
    assert.equal(data, 'tag:example.org,2003:3');
    events++;
  });

  parser.once('link', function(data) {
    assert.deepEqual(data, {
      $attr: {
        rel: 'alternate',
        type: 'text/html',
        hreflang: 'en',
        href: 'http://example.org/'
      }
    });
    events++;

    parser.once('link', function(data) {
      assert.deepEqual(data, {
        $attr: {
          rel: 'self',
          type: 'application/atom+xml',
          href: 'http://example.org/feed.atom'
        }
      });
      events++;
    });
  });

  parser.on('rights', function(data) {
    assert.equal(data, 'Copyright (c) 2003, Mark Pilgrim');
    events++;
  });

  parser.on('generator', function(data) {
    assert.deepEqual(data, {
      $attr: { uri: 'http://www.example.com/', version: '1.0' },
      $text: 'Example Toolkit'
    });
    events++;
  });

  fs.createReadStream(__dirname + '/atom.xml').pipe(parser);

  beforeExit(function() {
    assert.equal(events, 8);

    var feed = parser.done();
    assert.length(feed.link, 2);
    assert.length(feed.items, 1);
  });
};
