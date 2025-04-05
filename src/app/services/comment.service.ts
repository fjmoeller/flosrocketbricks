import {Injectable} from '@angular/core';
import {
  CommentAdminView,
  CommentCreateRequest,
  CommentDeleteAdminRequest,
  CommentDeleteRequest,
  CommentEditRequest,
  CommentView
} from "../model/comments";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private readonly COMMENT_BACKEND_URL: string = "https://comment.flosrocketbackend.com/";
  private readonly COMMENT_BACKEND_ADMIN_PATH: string = "adminAll";
  private readonly LOCALSTORAGE_USERNAME_KEY: string = "comment-username";

  readonly COMMENT_PASSWORD;

  constructor(private http: HttpClient) {
    this.COMMENT_PASSWORD = this.getRandomPassword();
  }

  createComment(target: string, creationRequest: CommentCreateRequest): Observable<CommentView> {
    return this.http.post<CommentView>(this.COMMENT_BACKEND_URL + target, creationRequest);
  }

  getComments(commentTargetKey: string): Observable<CommentView[]> {
    const url = this.COMMENT_BACKEND_URL + commentTargetKey;
    return this.http.get<CommentView[]>(url);
  }

  getCommentsAdmin(adminPassword: string): Observable<CommentAdminView[]> {
    const httpHeaders: HttpHeaders = new HttpHeaders({
      adminPassword: adminPassword
    });
    const url = this.COMMENT_BACKEND_URL + this.COMMENT_BACKEND_ADMIN_PATH;
    return this.http.get<CommentAdminView[]>(url,{headers: httpHeaders});
  }

  deleteComment(target: string, deletionRequest: CommentDeleteRequest): Observable<any> {
    return this.http.delete(this.COMMENT_BACKEND_URL + target, {body: deletionRequest});
  }

  deleteCommentAdmin(target: string, deletionRequest: CommentDeleteAdminRequest): Observable<any> {
    return this.http.delete(this.COMMENT_BACKEND_URL + target, {body: deletionRequest});
  }

  editComment(target: string, editingRequest: CommentEditRequest): Observable<CommentView> {
    return this.http.put<CommentView>(this.COMMENT_BACKEND_URL + target, editingRequest);
  }

  private getRandomPassword(): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  loadUsername(): string {
    const savedUsername: string | null = localStorage.getItem(this.LOCALSTORAGE_USERNAME_KEY);
    if (savedUsername !== null)
      return savedUsername;
    else
      return "";
  }

  saveUsername(username: string): void {
    localStorage.setItem(this.LOCALSTORAGE_USERNAME_KEY, username);
  }
}
