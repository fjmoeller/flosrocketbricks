import { Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class MetaServiceService {

  constructor(private metaTagService: Meta) { }

  setAllTags(title: string, desc: string, url: string, image: string): void {
    this.metaTagService.updateTag({ name: 'title', content: title });
    this.metaTagService.updateTag({ name: 'description', content: desc });

    this.metaTagService.updateTag({ property: 'og:title', content: title });
    this.metaTagService.updateTag({ property: 'og:description', content: desc });
    this.metaTagService.updateTag({ property: 'og:url', content: url });
    this.metaTagService.updateTag({ property: 'og:type', content: "website" });
    this.metaTagService.updateTag({ property: 'og:image', content: image });

    this.metaTagService.updateTag({ property: 'twitter:title', content: title });
    this.metaTagService.updateTag({ property: 'twitter:description', content: desc });
    this.metaTagService.updateTag({ property: 'twitter:url', content: url });
    this.metaTagService.updateTag({ property: 'twitter:card', content: "summary_large_image" });
    this.metaTagService.updateTag({ property: 'twitter:image', content: image });
  }

  setDefaultTags(title: string, url: string): void {
    let desc: string = "A website containing instructions and digital files of MOCs by me, completely for free!";
    let image: string = "https://flosrocketbricks.com/assets/logo.png";

    this.metaTagService.updateTag({ name: 'title', content: title });
    this.metaTagService.updateTag({ name: 'description', content: desc });

    this.metaTagService.updateTag({ property: 'og:title', content: title });
    this.metaTagService.updateTag({ property: 'og:description', content: desc });
    this.metaTagService.updateTag({ property: 'og:url', content: url });
    this.metaTagService.updateTag({ property: 'og:type', content: "website" });
    this.metaTagService.updateTag({ property: 'og:image', content: image });

    this.metaTagService.updateTag({ property: 'twitter:title', content: title });
    this.metaTagService.updateTag({ property: 'twitter:description', content: desc });
    this.metaTagService.updateTag({ property: 'twitter:url', content: url });
    this.metaTagService.updateTag({ property: 'twitter:card', content: "summary_large_image" });
    this.metaTagService.updateTag({ property: 'twitter:image', content: image });
  }
}
