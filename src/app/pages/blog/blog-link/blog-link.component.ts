import { Component, OnInit } from '@angular/core';
import { BlogContentElementComponent } from '../blog-content-element/blog-content-element.component';

@Component({
  selector: 'app-blog-link',
  standalone: true,
  imports: [],
  templateUrl: './blog-link.component.html',
  styleUrl: './blog-link.component.sass'
})
export class BlogLinkComponent extends BlogContentElementComponent {
}
