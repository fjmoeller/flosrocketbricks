export interface Blog {
  id: number;
  title: string;
  coverImage: string;
  shortDescription: string;
  content: BlogElement[];
  author: string;
  createdAt: string;
}

export interface BlogElement {
  title: string;
  content: string[];
  blogElementType: BlogElementType;
}

export enum BlogElementType {
  TEXT_WITH_TITLE = 0,
  IMAGE = 1,
  LINK = 2,
  TEXT_WITHOUT_TITLE = 3
}
