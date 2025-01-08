import {Component, OnInit} from '@angular/core';
import {Blog} from 'src/app/model/blog';
import {BlogGrabberService} from 'src/app/services/grabber/blog-grabber.service';
import {RouterLink} from "@angular/router";
import {MetaService} from "../../services/meta.service";


@Component({
  standalone: true,
  imports: [
    RouterLink
  ],
  selector: 'app-blog-overview',
  templateUrl: './blog-overview.component.html',
  styleUrls: ['./blog-overview.component.sass']
})
export class BlogOverviewComponent implements OnInit {

  blogs: Blog[] = [];

  constructor(private blogService: BlogGrabberService, private metaService: MetaService) {
  }

  ngOnInit(): void {
    this.blogs = this.blogService.getAllBlogs();
  }

  getPageBlogLink(blog: Blog): string {
    return this.metaService.getPageBlogLink(blog);
  }


}
