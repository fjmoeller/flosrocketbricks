import {Component, ElementRef, Inject, Input, OnInit, PLATFORM_ID, ViewChild} from '@angular/core';
import {CommentCreateRequest, CommentEditRequest, CommentView} from "../../model/comments";
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

  shownComments: { comment: CommentView; owned: boolean; reply?: CommentView | null }[] = [];
  allComments: { comment: CommentView; owned: boolean; reply?: CommentView | null }[] = [];

  createdComments: { id: number; password: string }[] = [];

  ngOnInit(): void {
    this.usernameInput = this.commentService.loadUsername();
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
    this.commentService.getComments(this.parentComponentType + "-" + this.parentComponentId).subscribe(
      comments => {
        //sort the list of comments and convert them to be viewable
        this.allComments = comments
          .sort((a: CommentView, b: CommentView) => b.time - a.time)
          .map(comment => {
              return {
                comment: comment,
                owned: !!this.createdComments.find(createdC => createdC.id === comment.id)
              };
            }
          );
        //add commentviews of replies to comment (if it is a reply to something)
        for (let i = 0; i < this.allComments.length; i++) {
          const currentComment = this.allComments[i];
          if (currentComment.comment.reply !== undefined) {
            //if this comment is a reply to another comment
            const findComment = this.allComments.find(
              c => c.comment.id === currentComment.comment.reply
            );
            if (findComment !== undefined) {
              currentComment.reply = findComment.comment;
            } else {
              currentComment.reply = null;
            }
          }
        }
        this.showSomeComments();
      }
    );
  }

  createComment(): void {
    //username not valid
    if (this.usernameInput.trim() === "" || this.usernameInput.trim().toLowerCase() === "skysaac"
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

    const newComment: CommentCreateRequest = {
      content: this.commentInput,
      password: this.commentService.COMMENT_PASSWORD,
      user: this.usernameInput,
    }

    if (this.activeReply !== null) {
      newComment["reply"] = this.activeReply.id;
    }

    this.commentService.saveUsername(newComment.user);

    this.commentService.createComment(this.parentComponentType + "-" + this.parentComponentId, newComment).subscribe(
      {
        next:
          comment => {
            this.activeReply = null;
            this.commentInput = "";
            this.commentInputLength = 0;
            this.createdComments.push({id: comment.id, password: newComment.password});
            const allCommentsElement: { comment: CommentView; owned: boolean; reply?: CommentView | null }
              = {comment: comment, owned: true};
            if (comment.reply !== undefined) {
              //if this comment is a reply to another comment
              const findComment = this.allComments.find(
                c => c.comment.id === comment.reply
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

  editComment(editRequest: CommentEditRequest): void {
    //set password from list of created comments
    const createdComment = this.createdComments.find(createdComment => createdComment.id === editRequest.id);
    if (createdComment !== undefined) {
      editRequest.password = createdComment.password;

      this.commentService.editComment(this.parentComponentType + "-" + this.parentComponentId, editRequest).subscribe({
        next: editedComment => {
          const indexInAllList = this.allComments.findIndex(comment => comment.comment.id === editRequest.id);
          if (indexInAllList >= 0) {
            this.allComments[indexInAllList] = {comment: editedComment, owned: true};
          }
          this.showSomeComments();
        }
      });
    }
  }

  deleteComment(id: number): void {
    const ownedComment = this.createdComments.find(c => c.id === id);
    if (ownedComment !== undefined) {
      this.commentService.deleteComment(this.parentComponentType + "-" + this.parentComponentId, ownedComment).subscribe({
        next: () => {
          const indexInAllList = this.allComments.findIndex(comment => comment.comment.id === id);
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
