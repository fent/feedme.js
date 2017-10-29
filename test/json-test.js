const FeedMe = require('..');
const fs     = require('fs');
const path   = require('path');
const assert = require('assert');


const file = path.join(__dirname, 'assets', 'jsonfeed.json');
const feed = {
  'type': 'json',
  'xmlns' : 'http://www.w3.org/2005/Atom',
  'xmlns$openSearch' : 'http://a9.com/-/spec/opensearchrss/1.0/',
  'id' : 'tag:blogger.com,1999:blog-934829683866516411',
  'updated' : '2007-03-18T20:43:19.434+01:00',
  'title' : 'Beautiful Beta',
  'link' : [ {
    'rel' : 'alternate',
    'type' : 'text/html',
    'href' : 'http://beautifulbeta.blogspot.com/index.html'
  },{
    'rel' : 'next',
    'type' : 'application/atom+xml',
    'href' : 'http://beautifulbeta.blogspot.com/feeds/posts/default?alt=json-in-script&start-index=26&max-results=25'
  },{
    'rel' : 'http://schemas.google.com/g/2005#feed',
    'type' : 'application/atom+xml',
    'href' : 'http://beautifulbeta.blogspot.com/feeds/posts/default'
  },{
    'rel' : 'self',
    'type' : 'application/atom+xml',
    'href' : 'http://beautifulbeta.blogspot.com/feeds/posts/default?alt=json-in-script'
  } ],
  'author' : [ { 
    'name' : 'Beta Bloke'
  } ],
  'generator' : {
    'version' : '7.00',
    'uri' : 'http://www2.blogger.com',
    'text' : 'Blogger'
  },
  'openSearch$totalResults' : '74',
  'openSearch$startIndex' : '1',
  'list': [1, 2, [3]],
  'items' : [ {
    'id' : 'tag:blogger.com,1999:blog-934829683866516411.post-8097606299472435819', 
    'published' : '2007-03-18T12:27:00.000+01:00',
    'updated' : '2007-03-18T12:35:19.236+01:00',
    'category' : [ {
      'scheme' : 'http://www.blogger.com/atom/ns#',
      'term' : 'tools'
    } ],
    'title' : 'What\'s Up Here',
    'content' :  'It has been very quiet on .....',
    'link' : [ {
      'rel' : 'alternate',
      'type' : 'text/html',
      'href' : 'http://beautifulbeta.blogspot.com/2007/03/whats-up-here.html'
    },{
      'rel' : 'self',
      'type' : 'application/atom+xml',
      'href' : 'http://beautifulbeta.blogspot.com/feeds/posts/default/8097606299472435819'
    },{
      'rel' : 'edit',
      'type' : 'application/atom+xml',
      'href' : 'http://www.blogger.com/feeds/934829683866516411/posts/default/8097606299472435819'
    } ],
    'author' : [ {
      'name' : 'Beta Bloke'
    } ]
  } ]
};


describe('Parse a JSON feed file', () => {
  var parser = new FeedMe();
  var events = 0;
  var item = 0;

  it('Events emitted match expected', (done) => {

    parser.on('type', (data) => {
      assert.deepEqual(data, feed.type);
      events++;
    });

    parser.on('title', (data) => {
      assert.deepEqual(data, feed.title);
      events++;
    });

    parser.on('updated', (data) => {
      assert.deepEqual(data, feed.updated);
      events++;
    });

    parser.on('id', (data) => {
      assert.deepEqual(data, feed.id);
      events++;
    });

    parser.once('link', (data) => {
      assert.deepEqual(data, feed.link[0]);
      events++;

      parser.once('link', (data) => {
        assert.deepEqual(data, feed.link[1]);
        events++;

        parser.once('link', (data) => {
          assert.deepEqual(data, feed.link[2]);
          events++;
        });
      });
    });

    parser.on('author', (data) => {
      assert.deepEqual(data, feed.author[0]);
      events++;
    });

    parser.on('generator', (data) => {
      assert.deepEqual(data, feed.generator);
      events++;
    });

    parser.on('item', (data) => {
      assert.deepEqual(data.title, feed.items[item].title);
      assert.deepEqual(data.link, feed.items[item].link);
      assert.deepEqual(data.id, feed.items[item].id);
      assert.deepEqual(data.updated, feed.items[item].updated);
      assert.deepEqual(data.author, feed.items[item].author);
      assert.deepEqual(data.contributor, feed.items[item].contributor);
      assert.deepEqual(data.content, feed.items[item].content);
      assert.deepEqual(data, feed.items[item]);
      item++;
    });

    fs.createReadStream(file).pipe(parser);
    parser.on('end', done);
  });

  after(() => {
    assert.equal(events, 9);
    assert.equal(item, 1);
    assert.deepEqual(parser.done(), undefined);
  });

  describe('with buffer on', () => {
    var parser = new FeedMe(true);

    it('Returns matching Javascript object', (done) => {
      fs.createReadStream(file).pipe(parser);

      parser.on('end', () => {
        assert.deepEqual(parser.done(), feed);
        done();
      });
    });
  });

});
