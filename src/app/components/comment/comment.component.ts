import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {CommentEditRequest, CommentView} from "../../model/comments";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NgStyle} from "@angular/common";

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
export class CommentComponent implements OnInit {

  readonly MAX_COMMENT_LENGTH = 512;

  @Output()
  editEmitter: EventEmitter<CommentEditRequest> = new EventEmitter();
  @Output()
  deleteEmitter: EventEmitter<number> = new EventEmitter();

  @Input()
  comment!: CommentView;
  @Input()
  isOwned: boolean = false;

  @ViewChild('commentEditElement')
  commentEditInputElement!: ElementRef;

  time: string = "";
  editEnabled: boolean = false;
  editText: string = "";
  editTextLength: number = 0;

  ngOnInit(): void {
    const date = new Date(this.comment.time * 1000);
    this.time = date.toLocaleString([], {dateStyle: 'short', timeStyle: 'short'});
  }

  enableEditing() {
    this.editText = this.comment.content;
    this.editEnabled = true;
  }

  disableEditing() {
    this.editText = "";
    this.editEnabled = false;
  }

  confirmEditComment() {
    const editRequest: CommentEditRequest = {
      content: this.editText,
      password: "", //will be set later
      id: this.comment.id
    };
    this.editEmitter.emit(editRequest);
  }

  deleteComment() {
    this.deleteEmitter.emit(this.comment.id);
  }

  commentInputChanged(): void {
    this.editTextLength = this.editText.length;
  }

  private shakeCommentInput(): void { //TODO add for edits
    this.commentEditInputElement.nativeElement.classList.add("shake");
    setTimeout(() => this.commentEditInputElement.nativeElement.classList.remove("shake"), 300);
  }

}
