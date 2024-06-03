import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Blog, BlogElement, BlogElementType } from 'src/app/model/blog';
import { BlogGrabberService } from 'src/app/services/grabber/blog-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';
import { BlogContentElementComponent } from './blog-content-element/blog-content-element.component';
import { BlogImageComponent } from './blog-image/blog-image.component';
import { BlogTextComponent } from './blog-text/blog-text.component';
import { BlogLinkComponent } from './blog-link/blog-link.component';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.sass']
})
export class BlogComponent implements OnInit {

  blog: Blog = new Blog(-1, "", "", [], "", "");

  blogContents: {
    component: BlogContentElementComponent,
    inputs: BlogElement,
  }[] = [];

  constructor(private router: Router, private route: ActivatedRoute, private metaService: MetaServiceService, private blogGrabberService: BlogGrabberService) {
  }

  ngOnInit() {
    if (this.route.snapshot.paramMap.get('id') === null) {
      this.router.navigate(['/404/']);
      return;
    }

    const foundBlog = this.blogGrabberService.getBlog(Number(this.route.snapshot.paramMap.get('id')));

    if (foundBlog === undefined) {
      this.router.navigate(['/404/']);
      return;
    }

    this.blog = foundBlog;
    this.metaService.setAllTags(this.blog.title + " - FlosRocketBricks", "FlosRocketBlog: " + this.blog.title + " by " + this.blog.author, this.metaService.getTotalBlogLink(this.blog), this.blog.coverImage);
    this.convertBlogContent();
  }

  convertBlogContent() {
    for (let blogElement of this.blog.content) {
      switch (blogElement.blogElementType) {
        case BlogElementType.IMAGE:
          this.blogContents.push({ component: new BlogImageComponent, inputs: blogElement });
          break;
        case BlogElementType.TEXT:
          this.blogContents.push({ component: new BlogTextComponent, inputs: blogElement });
          break;
        case BlogElementType.LINK:
          this.blogContents.push({ component: new BlogLinkComponent, inputs: blogElement });
          break;
      }
    }
  }
}
