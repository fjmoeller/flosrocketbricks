export interface ResponseComment {
  commentId: number;
  userId: number;
  username: string;
  content: string;
  time: number;
  postKey: string; //eg. M-201 M-MOC B-Blog C-Collection
  replySeen?: boolean | null;
  replyCommentId?: number | null;
}

export interface ViewComment extends ResponseComment{
  isOwned: boolean;
}

export interface CommentCreateRequest {
  userId: number;
  username: string;
  auth: string;
  content: string;
  replyCommentId?: number;
}

export interface CommentEditRequest {
  commentId: number;
  auth: string;
  content: string;
}

export interface CommentDeleteRequest {
  commentId: number;
  auth: string;
}

export interface CommentDeleteAdminRequest {
  commentId: number;
}

export interface CommentAdminView {
  key: string;
  value: ViewComment[];
}

export interface CommentAdminResponse {
  key: string;
  value: ResponseComment[];
}

export interface CommentSeenRequest {
  userId: number;
  auth: string;
  commentIds: number[];
}

/**
 * DB Key: B-1
 */
