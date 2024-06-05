export class Blog {
    id: number;
    title: string;
    coverImage: string;
    content: BlogElement[];
    author: string;
    createdAt: string;

    constructor(id: number, title: string, coverImage: string, content: BlogElement[], author: string, createdAt: string) {
        this.id = id;
        this.title = title
        this.coverImage = coverImage;
        this.content = content;
        this.author = author;
        this.createdAt = createdAt;
    }
}

export class BlogElement {
    title: string;
    content: string;
    blogElementType: BlogElementType;

    constructor(title: string, content: string, blogElementType: BlogElementType) {
        this.title = title
        this.content = content;
        this.blogElementType = blogElementType;
    }
}

export enum BlogElementType {
    IMAGE = 1,
    TEXT = 0,
    LINK = 2
}