const FeedMe = require('..');
const fs     = require('fs');
const path   = require('path');
const assert = require('assert');


const file1 = path.join(__dirname, 'assets', 'rdf.xml');
const feed1 = {
  type: 'rss 1.0',
  title: 'Pinboard (items tagged hardware)',
  link: 'https://pinboard.in/t:hardware/',
  description: '',
};


describe('Parse an RSS file with RDF schema', () => {
  var parser = new FeedMe();
  var events = 0;
  var item = 0;

  it('Matches JSON object', (done) => {
    parser.on('type', (data) => {
      assert.deepEqual(data, feed1.type);
      events++;
    });

    parser.on('title', (data) => {
      assert.equal(data, feed1.title);
      events++;
    });

    parser.on('link', (data) => {
      assert.equal(data, feed1.link);
      events++;
    });

    parser.on('description', (data) => {
      assert.equal(data, feed1.description);
      events++;
    });

    parser.on('item', () => {
      item++;
      events++;
    });

    fs.createReadStream(file1).pipe(parser);
    parser.on('end', () => {
      assert.equal(events, 74);
      assert.equal(item, 70);
      assert.deepEqual(parser.done(), undefined);
      done();
    });
  });

  describe('with buffer on', () => {
    var parser = new FeedMe(true);

    it('Returns matching Javascript object', (done) => {
      fs.createReadStream(file1).pipe(parser);
      parser.on('end', () => {
        var doc = parser.done();
        assert.equal(doc.type, feed1.type);
        assert.equal(doc.title, feed1.title);
        assert.equal(doc.link, feed1.link);
        assert.equal(doc.description, feed1.description);
        assert.equal(doc.items.length, 70);
        done();
      });
    });
  });
});
