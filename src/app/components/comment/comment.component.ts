import {
  Component,
  ElementRef,
  EventEmitter,
  Input, OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {ViewComment} from "../../model/comments";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NgStyle} from "@angular/common";
import {CommentService} from "../../services/comment.service";

@Component({
  selector: 'app-comment',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgStyle
  ],
  templateUrl: './comment.component.html',
  styleUrl: './comment.component.sass'
})
export class CommentComponent implements OnInit{

  readonly MAX_COMMENT_LENGTH = 512;
  readonly MAX_REPLY_LENGTH = 256;

  @Output()
  replyEmitter: EventEmitter<{ id: number, username: string }> = new EventEmitter();
  @Output()
  editEmitter: EventEmitter<{
    content: string,
    commentId: number,
  }> = new EventEmitter();
  @Output()
  deleteEmitter: EventEmitter<number> = new EventEmitter();

  @Input()
  comment!: ViewComment;
  @Input()
  reply: ViewComment | null | undefined;
  @Input()
  isOwned: boolean = false;
  @Input()
  isAdminView?: boolean;

  @ViewChild('commentEditElement')
  commentEditInputElement!: ElementRef;

  editEnabled: boolean = false;
  editText: string = "";
  editTextLength: number = 0;

  confirmDeleteActive: boolean = false;

  constructor(private commentService: CommentService) {
  }

  ngOnInit() {
  }

  setConfirmDeleteActive(value: boolean) {
    this.confirmDeleteActive = value;
  }

  getDate(time: number) {
    return new Date(time * 1000).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})
  }

  enableEditing() {
    this.editText = this.comment.content;
    this.editEnabled = true;
    this.confirmDeleteActive = false;
  }

  disableEditing() {
    this.editText = "";
    this.editEnabled = false;
  }

  fixCommentContent(content: string): string {
    return content.split("&amp;").join("&")
      .split("&lt;").join("<")
      .split("&gt;").join(">")
      .split("&quot;").join('"')
      .split("&#x27;").join("'")
      .split("&#x2F;").join("/");
  }

  confirmEditComment() {
    if (this.editText.length <= this.commentService.MAX_COMMENT_LENGTH) {
      const editRequest = {
        content: this.editText,
        commentId: this.comment.commentId
      };
      this.editEmitter.emit(editRequest);
      this.confirmDeleteActive = false;
    } else {
      this.shakeCommentInput();
    }
  }

  deleteComment() {
    this.deleteEmitter.emit(this.comment.commentId);
  }

  commentInputChanged(): void {
    this.editTextLength = this.editText.length;
  }

  startReply(): void {
    this.replyEmitter.emit({id: this.comment.commentId, username: this.comment.username});
    this.confirmDeleteActive = false;
  }

  private shakeCommentInput(): void {
    this.commentEditInputElement.nativeElement.classList.add("shake");
    setTimeout(() => this.commentEditInputElement.nativeElement.classList.remove("shake"), 300);
  }

}
