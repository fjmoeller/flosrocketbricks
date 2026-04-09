import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {
  ResponseComment,
  ViewComment,
  CommentAdminView,
  CommentCreateRequest,
  CommentDeleteRequest,
  CommentEditRequest, CommentSeenRequest, CommentAdminResponse
} from "../model/comments";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {map, Observable, tap} from "rxjs";
import {isPlatformBrowser} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private readonly COMMENT_BACKEND_URL: string = "https://comment.flosrocketbackend.com/";
  private readonly COMMENT_BACKEND_ADMIN_PATH: string = "adminAll";
  readonly LOCALSTORAGE_USERNAME_KEY: string = "comment-username";
  private readonly LOCALSTORAGE_USERID_KEY: string = "comment-userId-v1";
  private readonly LOCALSTORAGE_AUTH_KEY: string = "comment-userAuth-v1";

  readonly MAX_USERNAME_LENGTH: number = 16;
  readonly MAX_COMMENT_LENGTH: number = 512;
  readonly MIN_SECONDS_BETWEEN_COMMENTS: number = 5;

  private USER_CREATED: boolean = false;
  private USER_ID: number = -1;
  USER_NAME: string = "";
  private USER_AUTH: string = "";

  private lastCommentCreationTime: number = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: any, private http: HttpClient) {
    this.loadUserDataFromStorage();
  }

  canPostComment(): boolean {
    const breakTimeSeconds = this.MIN_SECONDS_BETWEEN_COMMENTS * 1000;
    return Date.now() - this.lastCommentCreationTime > breakTimeSeconds;
  }

  createComment(target: string, username: string, content: string, replyCommentId?: number): Observable<ViewComment> {
    const creationRequest: CommentCreateRequest = {
      userId: this.USER_ID,
      username: username,
      auth: this.USER_AUTH,
      replyCommentId: replyCommentId,
      content: content,
    };

    localStorage.setItem(this.LOCALSTORAGE_USERNAME_KEY, username);

    if(!this.USER_CREATED){
      localStorage.setItem(this.LOCALSTORAGE_AUTH_KEY,this.USER_AUTH);
    }

    return this.http.post<ResponseComment>(this.COMMENT_BACKEND_URL + target, creationRequest)
      .pipe(tap(() => {
        this.lastCommentCreationTime = Date.now();
      })).pipe(
        tap(responseComment=> {
          localStorage.setItem(this.LOCALSTORAGE_USERID_KEY,responseComment.userId+"");
          this.USER_ID = responseComment.userId;
        }),
        map(responseComment => {
          return {
            commentId: responseComment.commentId,
            userId: this.USER_ID,
            content: responseComment.content,
            username: responseComment.username,
            isOwned: responseComment.userId === this.USER_ID,
            postKey: responseComment.postKey,
            replyCommentId: responseComment.replyCommentId,
            replySeen: responseComment.replySeen,
            time: responseComment.time,
          };
        })
      );
  }

  getCommentsForMoc(commentTargetKey: string): Observable<ViewComment[]> {
    return this.http.get<ResponseComment[]>(this.COMMENT_BACKEND_URL + commentTargetKey).pipe(map(
      responseComments => responseComments.map(responseComment => {
        return {
          commentId: responseComment.commentId,
          userId: responseComment.userId,
          content: responseComment.content,
          username: responseComment.username,
          isOwned: responseComment.userId === this.USER_ID,
          postKey: responseComment.postKey,
          replyCommentId: responseComment.replyCommentId,
          replySeen: responseComment.replySeen,
          time: responseComment.time,
        };
      })
    ));
  }

  //TODO user this in the user notification section
  getCommentsForUser(userId: number): Observable<ViewComment[]> {
    const url = this.COMMENT_BACKEND_URL + "U-" + userId;
    const httpHeaders: HttpHeaders = new HttpHeaders({
      userAuth: this.USER_AUTH
    });
    return this.http.get<ResponseComment[]>(url, {headers: httpHeaders})
      .pipe(map(
        responseComments => responseComments.map(responseComment => {
          return {
            commentId: responseComment.commentId,
            userId: responseComment.userId,
            content: responseComment.content,
            username: responseComment.username,
            isOwned: responseComment.userId === this.USER_ID,
            postKey: responseComment.postKey,
            replyCommentId: responseComment.replyCommentId,
            replySeen: responseComment.replySeen,
            time: responseComment.time,
          };
        })
      ));
  }

  getCommentsAdmin(adminPassword: string): Observable<CommentAdminView[]> {
    const httpHeaders: HttpHeaders = new HttpHeaders({
      adminAuth: adminPassword
    });
    const url = this.COMMENT_BACKEND_URL + this.COMMENT_BACKEND_ADMIN_PATH;
    return this.http.get<CommentAdminResponse[]>(url, {headers: httpHeaders}).pipe(
      map(adminResponses =>
        adminResponses.map(adminResponses => {
          return {
            key: adminResponses.key, value: adminResponses.value.map(responseComment => {
              return {
                commentId: responseComment.commentId,
                userId: responseComment.userId,
                content: responseComment.content,
                username: responseComment.username,
                isOwned: responseComment.userId === this.USER_ID,
                postKey: responseComment.postKey,
                replyCommentId: responseComment.replyCommentId,
                replySeen: responseComment.replySeen,
                time: responseComment.time,
              };
            })
          };
        })
      )
    );
  }

  seenCommentForUser(commentIds: number[]): Observable<ViewComment> {
    const seenRequest: CommentSeenRequest = {
      userId: this.USER_ID,
      auth: this.USER_AUTH,
      commentIds
    };

    return this.http.post<ResponseComment>(this.COMMENT_BACKEND_URL + "seen", seenRequest)
      .pipe(map(responseComment => {
          return {
            commentId: responseComment.commentId,
            userId: responseComment.userId,
            content: responseComment.content,
            username: responseComment.username,
            isOwned: responseComment.userId === this.USER_ID,
            postKey: responseComment.postKey,
            replyCommentId: responseComment.replyCommentId,
            replySeen: responseComment.replySeen,
            time: responseComment.time,
          };
        }
      ));
  }

  deleteComment(target: string, commentId: number): Observable<any> {
    const commentDeleteRequest: CommentDeleteRequest = {
      commentId: commentId,
      auth: this.USER_AUTH,
    };

    return this.http.delete(this.COMMENT_BACKEND_URL + target, {
      body: commentDeleteRequest
    });
  }

  deleteCommentAdmin(target: string, commentId: number, adminAuth: string): Observable<any> {
    const httpHeaders: HttpHeaders = new HttpHeaders({
      adminAuth: adminAuth
    });
    return this.http.delete(this.COMMENT_BACKEND_URL + target, {body: {commentId: commentId}, headers: httpHeaders});
  }

  editComment(target: string, commentId: number, newContent: string): Observable<ViewComment> {
    const commentEditRequest: CommentEditRequest = {
      commentId,
      auth: this.USER_AUTH,
      content: newContent
    };

    return this.http.put<ResponseComment>(this.COMMENT_BACKEND_URL + target, commentEditRequest)
      .pipe(map(responseComment => {
          return {
            commentId: responseComment.commentId,
            userId: responseComment.userId,
            content: responseComment.content,
            username: responseComment.username,
            isOwned: responseComment.userId === this.USER_ID,
            postKey: responseComment.postKey,
            replyCommentId: responseComment.replyCommentId,
            replySeen: responseComment.replySeen,
            time: responseComment.time,
          };
        }
      ));
  }

  private generateAuth(): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  private loadUserDataFromStorage(): void {
    //if this is not the browser do nothing
    if (!isPlatformBrowser(this.platformId)) return;

    //see if there is a username and password saved
    const savedUsername: string = localStorage.getItem(this.LOCALSTORAGE_USERNAME_KEY) ?? "";
    const savedUserId: string | null = localStorage.getItem(this.LOCALSTORAGE_USERID_KEY);
    const savedAuth: string | null = localStorage.getItem(this.LOCALSTORAGE_AUTH_KEY);

    this.USER_ID = Number(savedUserId) ?? -1;
    this.USER_NAME = savedUsername;
    this.USER_AUTH = savedAuth ?? this.generateAuth();
    this.USER_CREATED = (savedUserId !== null && savedAuth !== null);


  }
}
