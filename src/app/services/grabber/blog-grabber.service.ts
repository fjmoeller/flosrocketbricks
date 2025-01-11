import {Injectable} from '@angular/core';
import blogs from '../../../assets/blogs.json';
import {Blog} from '../../model/blog';

@Injectable({
  providedIn: 'root'
})
export class BlogGrabberService {

  private blogs!: Blog[];

  constructor() {
    this.blogs = blogs as Blog[];
  }

  getBlog(id: number): Blog | undefined {
    return this.blogs.find(blog => blog.id == id);
  }

  getAllBlogs(): Blog[] {
    return this.blogs;
  }

  getNewestBlog(): Blog {
    return this.blogs.sort((a, b) => b.id - a.id)[0];
  }
}
