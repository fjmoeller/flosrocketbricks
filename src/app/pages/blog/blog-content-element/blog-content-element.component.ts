import { Component, Input } from '@angular/core';
import { BlogElement } from 'src/app/model/blog';

@Component({
  selector: 'app-blog-content-element',
  standalone: true,
  imports: [],
  templateUrl: './blog-content-element.component.html',
  styleUrl: './blog-content-element.component.sass'
})
export class BlogContentElementComponent {
  @Input() content!: BlogElement;
}
