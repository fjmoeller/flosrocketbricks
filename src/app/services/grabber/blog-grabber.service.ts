import { Injectable } from '@angular/core';
import blogs from '../../../assets/blogs.json';
import { Blog } from '../../model/blog';

@Injectable({
  providedIn: 'root'
})
export class BlogGrabberService {

  private blogs!: Blog[];

  constructor() {
    let parsedBlogs: Blog[] = blogs;
    this.blogs = parsedBlogs;
  }

  getBlog(id: number): Blog | undefined {
    return this.blogs.find(blog => blog.id == id);
  }

  getAllBlogs(): Blog[] {
    return this.blogs;
  }

  getEmptyBlog(): Blog{
    return new Blog(-1,"","",[],"","");
  }
}
