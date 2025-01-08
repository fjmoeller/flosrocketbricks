import { Component, OnInit, Type } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Blog, BlogElementType } from 'src/app/model/blog';
import { BlogGrabberService } from 'src/app/services/grabber/blog-grabber.service';
import { MetaService } from 'src/app/services/meta.service';
import { BlogImageComponent } from './blog-image/blog-image.component';
import { BlogTextComponent } from './blog-text/blog-text.component';
import { BlogLinkComponent } from './blog-link/blog-link.component';
import { NgComponentOutlet } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgComponentOutlet],
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.sass']
})
export class BlogComponent implements OnInit {

  blog!: Blog;

  blogContents: {
    component: Type<any>,
    inputs: Record<string, unknown>
  }[] = [];

  constructor(private router: Router, private route: ActivatedRoute, private metaService: MetaService, private blogGrabberService: BlogGrabberService) {
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
          this.blogContents.push({ component: BlogImageComponent, inputs: { "content": blogElement.content, "title": blogElement.title } });
          break;
        case BlogElementType.TEXT_WITH_TITLE:
          this.blogContents.push({ component: BlogTextComponent, inputs: { "content": blogElement.content, "title": blogElement.title } });
          break;
        case BlogElementType.LINK:
          this.blogContents.push({ component: BlogLinkComponent, inputs: { "content": blogElement.content, "title": blogElement.title } });
          break;
      }
    }
  }
}
