import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import FeedMe from '../src/feedme';

const rss = fs.readFileSync(path.join(__dirname, 'assets', 'rss2.xml'));
const json = fs.readFileSync(path.join(__dirname, 'assets', 'jsonfeed.json'));

const parse = (chunks: Buffer[]) =>
  new Promise<FeedMe>((resolve, reject) => {
    const parser = new FeedMe(true);
    parser.on('error', reject).on('finish', () => resolve(parser));
    for (const chunk of chunks) parser.write(chunk);
    parser.end();
  });

describe('Detect feed type across chunks', () => {
  it('Skips leading whitespace in an earlier chunk', async () => {
    const parser = await parse([Buffer.from(' \n'), rss]);
    assert.equal(parser.done()?.title, 'Liftoff News');
  });

  it('Skips a BOM in an earlier chunk', async () => {
    const parser = await parse([Buffer.from('\uFEFF'), json]);
    assert.ok(parser.done());
  });

  it('Handles a BOM split across chunks', async () => {
    const parser = await parse([
      Buffer.from([0xef]),
      Buffer.from([0xbb, 0xbf]),
      rss,
    ]);
    assert.equal(parser.done()?.title, 'Liftoff News');
  });

  it('Skips whitespace before a BOM', async () => {
    const parser = await parse([
      Buffer.from(' \n'),
      Buffer.from('\uFEFF'),
      json,
    ]);
    assert.ok(parser.done());
  });

  it('Errors for whitespace-only input', async () => {
    await assert.rejects(parse([Buffer.from(' \n\t')]), /Not a correctly/);
  });

  it('Ends cleanly for empty input', async () => {
    const parser = await parse([Buffer.alloc(0)]);
    assert.ok(parser instanceof FeedMe);
  });
});
