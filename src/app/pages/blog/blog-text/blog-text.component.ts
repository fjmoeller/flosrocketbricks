import { Component, OnInit } from '@angular/core';
import { BlogContentElementComponent } from '../blog-content-element/blog-content-element.component';

@Component({
  selector: 'app-blog-text',
  standalone: true,
  imports: [],
  templateUrl: './blog-text.component.html',
  styleUrl: './blog-text.component.sass'
})
export class BlogTextComponent extends BlogContentElementComponent {
}
