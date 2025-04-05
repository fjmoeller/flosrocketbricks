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

  readonly MAX_USERNAME_LENGTH = 16;
  readonly MAX_COMMENT_LENGTH = 512;
  readonly MAX_COMMENTS = 5;

  @Input()
  parentComponentType!: string;

  @Input()
  parentComponentId!: number;

  @ViewChild('commentInputElement')
  commentInputElement!: ElementRef;
  @ViewChild('usernameInputElement')
  usernameInputElement!: ElementRef;

  usernameInput: string = "";
  commentInput: string = "";

  usernameInputLength: number = 0;
  commentInputLength: number = 0;

  hasLoaded: boolean = false;

  constructor(private commentService: CommentService, @Inject(PLATFORM_ID) private platformId: any) {
  }

  shownComments: { comment: CommentView; owned: boolean }[] = [];
  allComments: { comment: CommentView; owned: boolean }[] = [];

  createdComments: { id: number; password: string }[] = [];

  ngOnInit(): void {
    this.usernameInput = this.commentService.loadUsername();
    if (isPlatformBrowser(this.platformId)) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.hasLoaded) {
            this.loadComments();
            this.hasLoaded = true;
          }
        })
      })
      observer.observe(document.getElementById("commentSectionWrapper")!)
    }

    //TODO reply
    //TODO use shakeCommentInput in comments.ts
    //TODO killswitch für GET und alles andere
    //TODO in front and backend max comment creating (10 sec or so?) -> post
    //TODO add metadata when a key has been modified for the admin all fetch? or maybe a boolean that says that the comments have been checked -> if new one gets added uncheck aw man idk
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
        this.allComments = comments
          .sort((a: CommentView, b: CommentView) => b.time - a.time)
          .map(comment => {
              return {
                comment: comment,
                owned: !!this.createdComments.find(createdC => createdC.id === comment.id)
              };
            }
          );
        this.showSomeComments();
      }
    );
  }

  createComment(): void {
    if (this.usernameInput.trim() === "" || this.usernameInput.trim().toLowerCase() === "skysaac"
      || this.usernameInput.length > this.MAX_USERNAME_LENGTH) {
      this.shakeUsernameInput();
      return;
    }

    if (this.commentInput.trim() === "" || this.usernameInput.length > this.MAX_COMMENT_LENGTH) {
      this.shakeCommentInput();
      return;
    }

    const newComment: CommentCreateRequest = {
      content: this.commentInput,
      password: this.commentService.COMMENT_PASSWORD,
      user: this.usernameInput
    }

    this.commentService.saveUsername(newComment.user);

    this.commentService.createComment(this.parentComponentType + "-" + this.parentComponentId, newComment).subscribe(
      {
        next:
          comment => {
            this.allComments.unshift({comment: comment, owned: true});
            this.commentInput = "";
            this.commentInputLength = 0;
            this.createdComments.push({id: comment.id, password: newComment.password});
            this.showSomeComments();
          }
      }
    )
  }

  editComment(editRequest: CommentEditRequest): void {
    //set password from list of created comments
    const createdComment = this.createdComments.find(createdComment => createdComment.id === editRequest.id);
    console.log(this.createdComments);
    console.log(editRequest);
    if (createdComment !== undefined) {
      editRequest.password = createdComment.password;

      this.commentService.editComment(this.parentComponentType + "-" + this.parentComponentId, editRequest).subscribe({
        next: editedComment => {
          const indexInShownList = this.shownComments.findIndex(comment => comment.comment.id === editRequest.id);
          const indexInAllList = this.allComments.findIndex(comment => comment.comment.id === editRequest.id);
          if (indexInShownList >= 0) {
            this.shownComments[indexInShownList] = {comment: editedComment, owned: true};
          }
          if (indexInAllList >= 0) {
            this.allComments[indexInAllList] = {comment: editedComment, owned: true};
          }
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

  private shakeUsernameInput(): void {
    this.usernameInputElement.nativeElement.classList.add("shake");
    setTimeout(() => this.usernameInputElement.nativeElement.classList.remove("shake"), 300);
  }

  private shakeCommentInput(): void {
    this.commentInputElement.nativeElement.classList.add("shake");
    setTimeout(() => this.commentInputElement.nativeElement.classList.remove("shake"), 300);
  }
}
