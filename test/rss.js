var FeedMe = require('../lib/feedme'),
      fs = require('fs');


exports['Read an RSS 2.0 file'] = function(beforeExit, assert) {
  var parser = new FeedMe(),
    feed = {},
    events = 0;
  
  parser.on('title', function(data) {
    assert.equal(data, 'Liftoff News');
    feed.title = data;
    events++;
  });

  parser.on('link', function(data) {
    assert.equal(data, 'http://liftoff.msfc.nasa.gov/');
    feed.link = data;
    events++;
  });

  parser.on('description', function(data) {
    assert.equal(data, 'Liftoff to Space Exploration.');
    feed.description = data;
    events++;
  });

  parser.on('language', function(data) {
    assert.equal(data, 'en-us');
    feed.language = data;
    events++;
  });

  parser.on('pubdate', function(data) {
    assert.equal(data, 'Tue, 10 Jun 2003 04:00:00 GMT');
    feed.pubdate = data;
    events++;
  });

  parser.on('lastbuilddate', function(data) {
    assert.equal(data, 'Tue, 10 Jun 2003 09:41:01 GMT');
    feed.lastbuilddate = data;
    events++;
  });

  parser.on('docs', function(data) {
    assert.equal(data, 'http://blogs.law.harvard.edu/tech/rss');
    feed.docs = data;
    events++;
  });

  parser.on('generator', function(data) {
    assert.equal(data, 'Weblog Editor 2.0');
    feed.generator = data;
    events++;
  });

  parser.on('managingeditor', function(data) {
    assert.equal(data, 'editor@example.com');
    feed.managingEditor = data;
    events++;
  });

  parser.on('webmaster', function(data) {
    assert.equal(data, 'webmaster@example.com');
    feed.webmaster = data;
    events++;
  });

  parser.write(fs.readFileSync(__dirname + '/rss2.xml', 'utf8'));

  beforeExit(function() {
    assert.equal(events, 10);
    assert.length(parser.done().items, 4);
  });
};
