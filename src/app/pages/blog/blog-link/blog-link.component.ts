import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-blog-link',
  standalone: true,
  imports: [],
  templateUrl: './blog-link.component.html',
  styleUrl: './blog-link.component.sass'
})
export class BlogLinkComponent {
  @Input() content: { link: string, linkDescription: string }[] = [];
  @Input() title?: string;

  getDomainFromUrl(url:string):string{
    let domain = url;
    if(domain.includes("://"))
      domain = domain.split("://")[1];
    return domain.split("/")[0];
  }
}
