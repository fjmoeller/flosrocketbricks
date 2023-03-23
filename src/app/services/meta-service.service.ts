import { DOCUMENT } from '@angular/common';
import { Injectable,Inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class MetaServiceService {

  constructor(@Inject(DOCUMENT) private dom: Document,private metaTagService: Meta, private titleService : Title) { }

  removeCanonicalUrl():void {
    this.updateCanonicalUrl(null);
  }

  updateCanonicalUrl(url:string | null){
    const head = this.dom.getElementsByTagName('head')[0];
    var element: HTMLLinkElement | null= this.dom.querySelector(`link[rel='canonical']`) || null
    if(url) {
      if (element==null) {
        element= this.dom.createElement('link') as HTMLLinkElement;
        head.appendChild(element);
      }
      element.setAttribute('rel','canonical')
      element.setAttribute('href',url)
    }
    else if(!url && element!=null){
      head.removeChild(element);
    }
  }

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