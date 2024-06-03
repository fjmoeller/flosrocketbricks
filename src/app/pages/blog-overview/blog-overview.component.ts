import { Component, OnInit } from '@angular/core';
import { Blog } from 'src/app/model/blog';
import { BlogGrabberService } from 'src/app/services/grabber/blog-grabber.service';


@Component({
  standalone: true,
  imports: [],
  selector: 'app-blog-overview',
  templateUrl: './blog-overview.component.html',
  styleUrls: ['./blog-overview.component.sass']
})
export class BlogOverviewComponent implements OnInit {

  blogs: Blog[] = [];

  constructor(private blogService: BlogGrabberService) { }

  ngOnInit(): void {
    this.blogs = this.blogService.getAllBlogs();
  }

}
