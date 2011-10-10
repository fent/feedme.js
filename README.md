Install
------------

    npm install feedme


Usage
------------------

```javascript
var FeedMe = require('feed');

var parser = new FeedMe();

parser.on('title', function(titel) {
  console.log('title of feed is', title);
});

parser.on('item', function(item) {
  console.log(item);
});

parser.write(fs.readFileSync('rssfeed.xml', 'utf8'));
```

feedme.js is an RSS/Atom feed parser. How is this different from the other few feed parsers? It uses [sax-js](https://github.com/isaacs/sax-js) for xml parsing, that means it is coded in pure Javascript and thus more deployable. I needed a parser that wouldn't require me to install external dependencies or to compile anything, so I created one with sax-js.


API
---
###new Feed()
Creates a new instance of the FeedMe parser.

###parser.write(xml)
Write to the parser.

###parser.done()
Signal to the parser that writing is done. It returns the feed as a Javascript object. Subelements are put as children objects with their names as keys. When one object has more than one child of the same name, they are put into an array. Items are always put into an array. Example from the `atom.xml` test:

```javascript{ title: { type: 'text', text: 'dive into mark' },
  subtitle: 
   { type: 'html',
     text: 'A <em>lot</em> of effort\nwent into making this effortless' },
  updated: '2005-07-31T12:29:29Z',
  id: 'tag:example.org,2003:3',
  link: 
   [ { rel: 'alternate',
       type: 'text/html',
       hreflang: 'en',
       href: 'http://example.org/' },
     { rel: 'self',
       type: 'application/atom+xml',
       href: 'http://example.org/feed.atom' } ],
  rights: 'Copyright (c) 2003, Mark Pilgrim',
  generator: 
   { uri: 'http://www.example.com/',
     version: '1.0',
     text: 'Example Toolkit' },
  items: 
   [ { title: 'Atom draft-07 snapshot',
       link: [Object],
       id: 'tag:example.org,2003:3.2397',
       updated: '2005-07-31T12:29:29Z',
       published: '2003-12-13T08:29:29-04:00',
       author: [Object],
       contributor: [Object],
       content: [Object] } ] }
```


###Event: 'item'
`function (item) { }`
Emitted whenever the parser finds a new feed item. An item can be inside an `<item>` or <entry>` tag.

###Event: `tagname`
`function (value) { }`
Emitted whenever a tag on the root of the document is finished parsing. The root being the `<channel>` or `<feed>` tag. Example:

```javascript
parser.on('description', function(d) {
  // do something
});
```

###Event: 'error'
From the sax-js parser. Emitted when there is an error parsing the document.
