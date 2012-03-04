# FeedMe.js [![Build Status](https://secure.travis-ci.org/fent/feedme.js.png)](http://travis-ci.org/fent/feedme.js)
feedme.js is an RSS/Atom/JSON feed parser. How is this different from the other few feed parsers? It uses [sax-js](https://github.com/isaacs/sax-js) for xml parsing and [clarinet](https://github.com/dscape/clarinet) for json parsing. That means it is coded in pure Javascript and thus more deployable. I needed a parser that wouldn't require me to install external dependencies or to compile anything.


# Usage

```javascript
var FeedMe = require('feed')
  , parser = new FeedMe()
  , fs = require('fs')

parser.on('title', function(titel) {
  console.log('title of feed is', title);
});

parser.on('item', function(item) {
  console.log(item);
});

// sax-js and clarinet allow streaming
// which means faster parsing for larger feeds!
fs.createReadStream('rssfeed.xml').pipe(parser);
```


# API

### new FeedMe([buffer])
Creates a new instance of the FeedMe parser. `buffer` can be `true` if you want the parser to buffer the entire feed document as a JSON object, letting you use the `FeedMe#done()` method.

### parser.write(xml)
Write to the parser.

### parser.done()
Can only be used if `buffer` is `true`. It returns the feed as a Javascript object. Subelements are put as children objects with their names as keys. When one object has more than one child of the same name, they are put into an array. Items are always put into an array. Example from the `rss2.xml` test:

```javascript
{
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
      description: 'Compared to earlier spacecraft, the International Space Station has many luxuries, but laundry facilities are not one of them.  Instead, astronauts have other options.',
      pubdate: 'Tue, 20 May 2003 08:56:02 GMT',
      guid: 'http://liftoff.msfc.nasa.gov/2003/05/20.html#item570'    }
  ]
}
```


### Event: 'item'
`function (item) { }`
Emitted whenever the parser finds a new feed item. An item can be inside an `<item>` or <entry>` tag.

### Event: `tagname`
`function (value) { }`
Emitted whenever a tag on the root of the document is finished parsing. The root being the `<channel>` or `<feed>` tag. Example:

```javascript
parser.on('description', function(d) {
  // do something
});
```

### Event: 'type'
`function (type) { }`
Type of feed. Example: atom, rss 2.0, json.

### Event: 'error'
`function (err) { }`
Emitted when there is an error parsing the document.


# Install

```bash
npm install feedme
```


# Tests
Tests are written with [mocha](http://visionmedia.github.com/mocha/)

```bash
npm test
```


# License
MIT
