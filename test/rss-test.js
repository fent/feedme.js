const FeedMe = require('..');
const fs     = require('fs');
const path   = require('path');
const assert = require('assert');


const file1 = path.join(__dirname, 'assets', 'rss2.xml');
const feed1 = {
  type: 'rss 2.0',
  title: 'Liftoff News',
  link: 'http://liftoff.msfc.nasa.gov/',
  description: 'Liftoff to Space Exploration.',
  language: 'en-us',
  pubdate: 'Tue, 10 Jun 2003 04:00:00 GMT',
  lastbuilddate: 'Tue, 10 Jun 2003 09:41:01 GMT',
  docs: 'http://blogs.law.harvard.edu/tech/rss',
  generator: 'Weblog Editor 2.0',
  managingeditor: 'editor@example.com',
  webmaster: 'webmaster@example.com',
  items:  [
    {
      title: 'Star City',
      link: 'http://liftoff.msfc.nasa.gov/news/2003/news-starcity.asp',
      description: 'How do Americans get ready to work with Russians aboard the International Space Station? They take a crash course in culture, language and protocol at Russia\'s <a href="http://howe.iki.rssi.ru/GCTC/gctc_e.htm">Star City</a>.',
      pubdate: 'Tue, 03 Jun 2003 09:39:21 GMT',
      guid: 'http://liftoff.msfc.nasa.gov/2003/06/03.html#item573'
    },
    {
      description: 'Sky watchers in Europe, Asia, and parts of Alaska and Canada will experience a <a href="http://science.nasa.gov/headlines/y2003/30may_solareclipse.htm">partial eclipse of the Sun</a> on Saturday, May 31st.',
      pubdate: 'Fri, 30 May 2003 11:06:42 GMT',
      guid: 'http://liftoff.msfc.nasa.gov/2003/05/30.html#item572'    },
    {
      title: 'The Engine That Does More',
      link: 'http://liftoff.msfc.nasa.gov/news/2003/news-VASIMR.asp',
      description: 'Before man travels to Mars, NASA hopes to design new engines that will let us fly through the Solar System more quickly.  The proposed VASIMR engine would do that.',
      pubdate: 'Tue, 27 May 2003 08:37:32 GMT',
      guid: 'http://liftoff.msfc.nasa.gov/2003/05/27.html#item571'    },
    {
      title: 'Astronauts\' Dirty Laundry',
      link: 'http://liftoff.msfc.nasa.gov/news/2003/news-laundry.asp',
      description: '',
      pubdate: 'Tue, 20 May 2003 08:56:02 GMT',
      guid: 'http://liftoff.msfc.nasa.gov/2003/05/20.html#item570'    }
  ]
};


describe('Parse an RSS 2.0 file', () => {
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

    parser.on('language', (data) => {
      assert.equal(data, feed1.language);
      events++;
    });

    parser.on('pubdate', (data) => {
      assert.equal(data, feed1.pubdate);
      events++;
    });

    parser.on('lastbuilddate', (data) => {
      assert.equal(data, feed1.lastbuilddate);
      events++;
    });

    parser.on('docs', (data) => {
      assert.equal(data, feed1.docs);
      events++;
    });

    parser.on('generator', (data) => {
      assert.equal(data, feed1.generator);
      events++;
    });

    parser.on('managingeditor', (data) => {
      assert.equal(data, feed1.managingeditor);
      events++;
    });

    parser.on('webmaster', (data) => {
      assert.equal(data, feed1.webmaster);
      events++;
    });

    parser.on('item', (data) => {
      assert.equal(data.title, feed1.items[item].title);
      assert.equal(data.link, feed1.items[item].link);
      assert.equal(data.description, feed1.items[item].description);
      assert.equal(data.pubdate, feed1.items[item].pubdate);
      assert.equal(data.guid, feed1.items[item].guid);
      assert.deepEqual(data, feed1.items[item]);
      item++;
      events++;
    });

    fs.createReadStream(file1).pipe(parser);
    parser.on('end', () => {
      assert.equal(events, 15);
      assert.deepEqual(parser.done(), undefined);
      done();
    });
  });

  describe('with buffer on', () => {
    var parser = new FeedMe(true);

    it('Returns matching Javascript object', (done) => {
      fs.createReadStream(file1).pipe(parser);

      parser.on('end', () => {
        assert.deepEqual(parser.done(), feed1);
        done();
      });
    });
  });
});
