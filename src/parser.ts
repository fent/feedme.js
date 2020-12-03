import { Writable } from 'stream';


export type FeedObject = {
  [key: string]: string | boolean | null | FeedObject | FeedObject[];
}
export type FeedItem = {
  [key: string]: FeedObject;
}
export type Feed = {
  type: string;
  items: FeedItem[];
  [key: string]: string | FeedObject | FeedObject[];
}

export interface Parser extends Writable {
  _buffer: boolean;
  parser: Writable;
  done(): Feed;
}
