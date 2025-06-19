import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {CommentEditRequest, CommentView} from "../../model/comments";
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
export class CommentComponent {

  readonly MAX_COMMENT_LENGTH = 512;
  readonly MAX_REPLY_LENGTH = 256;

  @Output()
  replyEmitter: EventEmitter<{ id: number, username: string }> = new EventEmitter();
  @Output()
  editEmitter: EventEmitter<CommentEditRequest> = new EventEmitter();
  @Output()
  deleteEmitter: EventEmitter<number> = new EventEmitter();

  @Input()
  comment!: CommentView;
  @Input()
  reply: CommentView | null | undefined;
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

  fixCommentContent(content:string): string {
    return content.split("&amp;").join("&")
      .split("&lt;").join("<")
      .split("&gt;").join(">")
      .split("&quot;").join('"')
      .split("&#x27;").join("'")
      .split("&#x2F;").join("/");
  }

  confirmEditComment() {
    if (this.editText.length <= this.commentService.MAX_COMMENT_LENGTH) {
      const editRequest: CommentEditRequest = {
        content: this.editText,
        password: "", //will be set later
        id: this.comment.id
      };
      this.editEmitter.emit(editRequest);
      this.confirmDeleteActive = false;
    } else {
      this.shakeCommentInput();
    }
  }

  deleteComment() {
    this.deleteEmitter.emit(this.comment.id);
  }

  commentInputChanged(): void {
    this.editTextLength = this.editText.length;
  }

  startReply(): void {
    this.replyEmitter.emit({id: this.comment.id, username: this.comment.user});
    this.confirmDeleteActive = false;
  }

  private shakeCommentInput(): void {
    this.commentEditInputElement.nativeElement.classList.add("shake");
    setTimeout(() => this.commentEditInputElement.nativeElement.classList.remove("shake"), 300);
  }

}
