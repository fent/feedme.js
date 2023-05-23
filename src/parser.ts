import { Writable } from 'node:stream';


export type FeedObject = string | {
  [key: string]: string | boolean | null | FeedObject | FeedObject[];
}
export type FeedItem = {
  [key: string]: FeedObject;
}
export type Feed = {
  type: string;
  items: FeedItem[];
  [key: string]: FeedObject | FeedObject[];
}

export interface Parser extends Writable {
  _buffer: boolean;
  parser: Writable;
  done(): Feed | undefined;
}
