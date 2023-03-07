import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class MetaServiceService {

  constructor(private metaTagService: Meta, private titleService : Title) { }

  setAllTags(title: string, desc: string, url: string, image: string): void {
    this.titleService.setTitle(title);

    this.metaTagService.updateTag({ name: 'title', content: title });
    this.metaTagService.updateTag({ name: 'description', content: desc });

    this.metaTagService.updateTag({ property: 'og:title', content: title });
    this.metaTagService.updateTag({ property: 'og:description', content: desc });
    this.metaTagService.updateTag({ property: 'og:url', content: url });
    this.metaTagService.updateTag({ property: 'og:type', content: "website" });
    this.metaTagService.updateTag({ property: 'og:image', content: image });

    this.metaTagService.updateTag({ name: 'twitter:title', content: title });
    this.metaTagService.updateTag({ name: 'twitter:description', content: desc });
    this.metaTagService.updateTag({ name: 'twitter:url', content: url });
    this.metaTagService.updateTag({ name: 'twitter:card', content: "summary_large_image" });
    this.metaTagService.updateTag({ name: 'twitter:image', content: image });
  }

  setDefaultTags(title: string, url: string): void {
    let desc: string = "A website containing instructions and digital files of MOCs by me, completely for free!";
    let image: string = "https://flosrocketbricks.com/assets/logo.png";

    this.setAllTags(title,desc,url,image);
  }
}
