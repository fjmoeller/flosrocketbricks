import {Component} from '@angular/core';
import {CommentComponent} from "../../components/comment/comment.component";
import {CommentAdminView, CommentDeleteAdminRequest, CommentEditRequest, CommentView} from "../../model/comments";
import {CommentService} from "../../services/comment.service";
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MetaService} from "../../services/meta.service";
import {MocGrabberService} from "../../services/grabber/moc-grabber.service";
import {BlogGrabberService} from "../../services/grabber/blog-grabber.service";

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
export class AdminComponent {

  comments: { target: string; comment: CommentView, reply?: CommentView, href:string }[] = [];

  form: FormGroup;

  constructor(private commentService: CommentService, private metaService:MetaService, private mocGrabberService:MocGrabberService, private blogGrabberService:BlogGrabberService) {
    this.form = new FormGroup({
      adminPassword: new FormControl(''),
    });
  }

  loadComments(): void {
    this.commentService.getCommentsAdmin(this.form.value.adminPassword).subscribe({
      next: (rawComments: CommentAdminView[]) => {
        const allComments: { target: string; comment: CommentView, reply?: CommentView, href:string }[] = [];
        for (let mocIndex = 0; mocIndex < rawComments.length; mocIndex++) {
          const mocComments: CommentAdminView = rawComments[mocIndex];

          if(mocComments.value.length === 0) continue;

          let href = "";
          const splitKey = mocComments.key.split("-");

          if(splitKey[0] === "B"){
            const foundBlog = this.blogGrabberService.getBlog(Number(splitKey[1]));
            href = this.metaService.getTotalBlogLink(foundBlog!);

          }else { //splitKey[0] === "M"
            const foundMoc = this.mocGrabberService.getMoc(Number(splitKey[1]));
            href = this.metaService.getTotalMocLink(foundMoc!);
          }
          for (let commentIndex = 0; commentIndex < mocComments.value.length; commentIndex++) {
            const reply = mocComments.value.find(comment => comment.id === mocComments.value[commentIndex].reply);
            allComments.push({target: mocComments.key, comment: mocComments.value[commentIndex],reply:reply, href:href});
          }
        }
        this.comments = allComments.sort((a, b) => b.comment.time - a.comment.time);
      },
      error: err => {
        console.log("Failed to load comments: " + err.message);
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
