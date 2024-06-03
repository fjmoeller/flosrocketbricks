import { Component, OnInit } from '@angular/core';
import { BlogContentElementComponent } from '../blog-content-element/blog-content-element.component';

@Component({
  selector: 'app-blog-image',
  standalone: true,
  imports: [],
  templateUrl: './blog-image.component.html',
  styleUrl: './blog-image.component.sass'
})
export class BlogImageComponent extends BlogContentElementComponent {
}
