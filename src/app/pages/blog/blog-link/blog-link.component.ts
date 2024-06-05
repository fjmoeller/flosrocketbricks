import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-blog-link',
  standalone: true,
  imports: [],
  templateUrl: './blog-link.component.html',
  styleUrl: './blog-link.component.sass'
})
export class BlogLinkComponent {
  @Input() content!: string;
  @Input() title!: string;
}
