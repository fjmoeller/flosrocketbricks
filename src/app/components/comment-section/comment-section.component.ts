import {Component, ElementRef, Inject, Input, OnInit, PLATFORM_ID, ViewChild} from '@angular/core';
import {ViewComment} from "../../model/comments";
import {CommentService} from "../../services/comment.service";
import {CommentComponent} from "../comment/comment.component";
import {FormsModule} from "@angular/forms";
import {isPlatformBrowser, NgStyle} from "@angular/common";

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [
    CommentComponent,
    FormsModule,
    NgStyle
  ],
  templateUrl: './comment-section.component.html',
  styleUrl: './comment-section.component.sass'
})
export class CommentSectionComponent implements OnInit {

  readonly MAX_COMMENTS = 5;
  MAX_COMMENT_LENGTH: number;
  MAX_USERNAME_LENGTH: number;

  @Input()
  parentComponentType!: string;

  @Input()
  parentComponentId!: number;

  @ViewChild('commentInputElement')
  commentInputElement!: ElementRef;
  @ViewChild('usernameInputElement')
  usernameInputElement!: ElementRef;
  @ViewChild('sendCommentButtonElement')
  sendCommentButtonElement!: ElementRef;

  usernameInput: string = "";
  commentInput: string = "";

  usernameInputLength: number = 0;
  commentInputLength: number = 0;

  tooManyCommentsTextActive: boolean = false;
  haveCommentsLoaded: boolean = false;

  activeReply: { id: number, username: string } | null = null;

  constructor(private commentService: CommentService, @Inject(PLATFORM_ID) private platformId: any) {
    this.MAX_COMMENT_LENGTH = commentService.MAX_COMMENT_LENGTH;
    this.MAX_USERNAME_LENGTH = commentService.MAX_USERNAME_LENGTH;
  }

  shownComments: { comment: ViewComment; reply: ViewComment | null }[] = [];
  allComments: { comment: ViewComment; reply: ViewComment | null }[] = [];

  ngOnInit(): void {
    this.usernameInput = this.commentService.USER_NAME;
    if (isPlatformBrowser(this.platformId)) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.haveCommentsLoaded) {
            this.loadComments();
            this.haveCommentsLoaded = true;
          }
        })
      })
      observer.observe(document.getElementById("commentSectionWrapper")!)
    }
  }

  usernameInputChanged(): void {
    this.usernameInputLength = this.usernameInput.length;
  }

  commentInputChanged(): void {
    this.commentInputLength = this.commentInput.length;
  }

  showAllComments(): void {
    this.shownComments = this.allComments;
  }

  showSomeComments(): void {
    this.shownComments = this.allComments.slice(0, this.MAX_COMMENTS);
  }

  loadComments(): void {
    this.commentService.getCommentsForMoc(this.parentComponentType + "-" + this.parentComponentId).subscribe({
        next: comments => {
          //sort the list of comments and convert them to be viewable
          this.allComments = comments
            .sort((a: ViewComment, b: ViewComment) => b.time - a.time)
            .map(comment => {
                return {
                  comment: comment,
                  reply:
                    comment.replyCommentId ?
                      comments.find(sC =>
                        sC.commentId === comment.replyCommentId
                      ) ?? null
                      : null
                };
              }
            );
          this.showSomeComments();
        },
        error: err => {
          console.log("Failed to load comments: " + err.message);
        }
      }
    );
  }

  createComment(): void {
    //username not valid
    if (this.usernameInput.trim() === "" || this.usernameInput.trim().toLowerCase().includes("skysaac")
      || this.usernameInput.length > this.MAX_USERNAME_LENGTH) {
      this.shakeUsernameInput();
      return;
    }

    //comment not valid
    if (this.commentInput.trim() === "" || this.usernameInput.length > this.MAX_COMMENT_LENGTH) {
      this.shakeCommentInput();
      return;
    }

    //too many requests
    if (!this.commentService.canPostComment()) {
      this.tooManyCommentsTextActive = true;
      this.shakeCommentButton();
      setTimeout(() => {
        this.tooManyCommentsTextActive = false;
      }, 10000);
      return;
    }

    const target = this.parentComponentType + "-" + this.parentComponentId;

    this.commentService.createComment(target, this.usernameInput, this.commentInput,
      this.activeReply ? this.activeReply.id : undefined).subscribe(
      {
        next:
          comment => {
            this.activeReply = null;
            this.commentInput = "";
            this.commentInputLength = 0;
            const allCommentsElement: { comment: ViewComment; reply: ViewComment | null }
              = {comment: comment, reply: null};
            if (comment.replyCommentId !== undefined) {
              //if this comment is a reply to another comment
              const findComment = this.allComments.find(
                c => c.comment.commentId === comment.replyCommentId
              );
              if (findComment !== undefined) {
                allCommentsElement.reply = findComment.comment;
              } else {
                allCommentsElement.reply = null;
              }
            }
            this.allComments.unshift(allCommentsElement);
            this.showSomeComments();
          }
      }
    )
  }

  editComment(commentId:number,newContent:string): void {
    this.commentService.editComment(this.parentComponentType + "-" + this.parentComponentId, commentId,newContent).subscribe({
      next: editedComment => {
        const indexInAllList = this.allComments.findIndex(comment => comment.comment.commentId === commentId);
        if (indexInAllList >= 0) {
          this.allComments[indexInAllList] = {comment: editedComment, reply:this.allComments[indexInAllList].reply};
        }
        this.showSomeComments();
      }
    });
  }

  deleteComment(id: number): void {
    const ownedComment = this.allComments.find(c => c.comment.commentId === id);
    if (ownedComment !== undefined) {
      this.commentService.deleteComment(this.parentComponentType + "-" + this.parentComponentId, id).subscribe({
        next: () => {
          const indexInAllList = this.allComments.findIndex(comment => comment.comment.commentId === id);
          if (indexInAllList >= 0) {
            this.allComments.splice(indexInAllList, 1);
          }
          this.showSomeComments();
        }
      });
    }
  }

  replyComment(reply: { id: number, username: string }): void {
    this.activeReply = reply;
  }

  cancelReply(): void {
    this.activeReply = null;
  };

  private shakeElement(ref: ElementRef) {
    ref.nativeElement.classList.add("shake");
    setTimeout(() => ref.nativeElement.classList.remove("shake"), 300);
  }

  private shakeUsernameInput(): void {
    this.shakeElement(this.usernameInputElement);
  }

  private shakeCommentInput(): void {
    this.shakeElement(this.commentInputElement);
  }

  private shakeCommentButton(): void {
    this.shakeElement(this.sendCommentButtonElement);
  }
}
