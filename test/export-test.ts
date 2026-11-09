import assert from 'node:assert';
import FeedMe, { FeedMe as NamedFeedMe } from '..';

describe('Exports', () => {
  it('Exposes class as default and named export', () => {
    assert.strictEqual(FeedMe, NamedFeedMe);
    assert.strictEqual(FeedMe.FeedMe, FeedMe);
    assert.strictEqual(FeedMe.default, FeedMe);
  });
});
