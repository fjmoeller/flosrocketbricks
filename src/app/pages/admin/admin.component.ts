import {Component} from '@angular/core';
import {CommentComponent} from "../../components/comment/comment.component";
import {CommentAdminView, CommentDeleteAdminRequest, CommentEditRequest, CommentView} from "../../model/comments";
import {CommentService} from "../../services/comment.service";
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommentComponent,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.sass'
})
export class AdminComponent{

  comments: { target: string; comment: CommentView }[] = [];

  form: FormGroup;

  constructor(private commentService: CommentService) {
    this.form = new FormGroup({
      adminPassword: new FormControl(''),
    });
  }

  loadComments(): void {
    this.commentService.getCommentsAdmin(this.form.value.adminPassword).subscribe({
      next: (data: CommentAdminView[]) => {
        const allComments: { target: string; comment: CommentView }[] = [];
        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].value.length; j++) {
            allComments.push({target: data[i].key, comment: data[i].value[j]});
          }
        }
        this.comments = allComments.sort((a, b) => b.comment.time - a.comment.time);
      },
      error: err => {
        console.log("Failed to load comments: "+err.message);
      }
    })
  }

  deleteComment(id: number, target: string) {
    const request: CommentDeleteAdminRequest = {
      id: id,
      adminPassword: this.form.value.adminPassword
    }
    this.commentService.deleteCommentAdmin(target, request).subscribe({
      next: () => {
        const index = this.comments.findIndex(c => c.target === target && c.comment.id === id);
        this.comments.splice(index, 1);
      }
    })
  }

  editComment(request: CommentEditRequest) {
    //lol no
  }
}
