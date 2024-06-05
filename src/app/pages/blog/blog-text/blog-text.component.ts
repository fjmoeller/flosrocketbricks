import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-blog-text',
  standalone: true,
  imports: [],
  templateUrl: './blog-text.component.html',
  styleUrl: './blog-text.component.sass'
})
export class BlogTextComponent {
  @Input() content!: string;
  @Input() title!: string;
}
