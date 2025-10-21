import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {
  CommentAdminView,
  CommentCreateRequest,
  CommentDeleteAdminRequest,
  CommentDeleteRequest,
  CommentEditRequest,
  CommentView
} from "../model/comments";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {Observable, tap} from "rxjs";
import {isPlatformBrowser} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private readonly COMMENT_BACKEND_URL: string = "https://comment.flosrocketbackend.com/";
  private readonly COMMENT_BACKEND_ADMIN_PATH: string = "adminAll";
  private readonly LOCALSTORAGE_USERNAME_KEY: string = "comment-username";

  readonly MAX_USERNAME_LENGTH: number = 16;
  readonly MAX_COMMENT_LENGTH: number = 512;
  readonly MIN_SECONDS_BETWEEN_COMMENTS: number = 5;

  readonly COMMENT_PASSWORD: string;

  private lastCommentCreationTime: number = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: any, private http: HttpClient) {
    this.COMMENT_PASSWORD = this.generateRandomPassword();
  }

  canPostComment(): boolean {
    const breakTimeSeconds = this.MIN_SECONDS_BETWEEN_COMMENTS * 1000;
    return Date.now() - this.lastCommentCreationTime > breakTimeSeconds;
  }

  createComment(target: string, creationRequest: CommentCreateRequest): Observable<CommentView> {
    return this.http.post<CommentView>(this.COMMENT_BACKEND_URL + target, creationRequest)
      .pipe(tap(() => this.lastCommentCreationTime = Date.now()));
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
    return this.http.get<CommentAdminView[]>(url, {headers: httpHeaders});
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

  private generateRandomPassword(): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  loadUsername(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return "";
    }
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
