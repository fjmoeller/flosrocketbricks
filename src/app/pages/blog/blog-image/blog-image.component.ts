import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-blog-image',
  standalone: true,
  imports: [],
  templateUrl: './blog-image.component.html',
  styleUrl: './blog-image.component.sass'
})
export class BlogImageComponent {
  @Input() content!: string;
  @Input() title!: string;
}
