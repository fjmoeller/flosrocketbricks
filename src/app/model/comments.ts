export interface CommentView {
  id: number;
  user: string;
  content: string;
  time: number;
  reply?: string;
}

export interface CommentCreateRequest {
  user: string; //16 Zeichen [A-z0-9]
  password: string; //8 Zeichen [A-z0-9]
  content: string; //512 Zeichen?
  reply?: string;
}

export interface CommentEditRequest {
  password: string;
  id: number;
  content: string;
}

export interface CommentDeleteRequest {
  password: string;
  id: number;
}

export interface CommentDeleteAdminRequest {
  adminPassword: string;
  id: number;
}

export interface CommentAdminView {
  key: string;
  value: CommentView[];
}

/**
 * DB Key: B-1
 */
