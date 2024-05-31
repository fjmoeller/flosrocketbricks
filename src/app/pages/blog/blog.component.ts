import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Blog } from 'src/app/model/blog';
import { BlogGrabberService } from 'src/app/services/grabber/blog-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.sass']
})
export class BlogComponent implements OnInit {

  blog: Blog;

  constructor(private router: Router, private route: ActivatedRoute, private metaService: MetaServiceService, private blogGrabberService: BlogGrabberService) {
    this.blog = this.blogGrabberService.getEmptyBlog();
  }

  async ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      const id = Number(paramMap.get('id')) || 0;
      const foundBlog = this.blogGrabberService.getBlog(id);
      if (foundBlog != undefined) {
        this.blog = foundBlog;
        this.metaService.setAllTags(this.blog.title + " - FlosRocketBricks", this.blog.title + " by "+this.blog.author, this.metaService.getTotalBlogLink(this.blog), this.blog.coverImage);
      }
      else {
        this.router.navigate(['/404/']);
      }
    });
    /*
    <ng-container *ngComponentOutlet="
      currentBlog.component;
      inputs: currentBlog.inputs;" />
    */
  }

}
