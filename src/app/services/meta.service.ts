import {DOCUMENT} from '@angular/common';
import {Injectable, Inject} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {Moc} from '../model/classes';
import {Blog} from '../model/blog';

@Injectable({
  providedIn: 'root'
})
export class MetaService {

  constructor(@Inject(DOCUMENT) private dom: Document, private metaTagService: Meta, private titleService: Title) {
  }

  removeCanonicalUrl(): void {
    this.updateCanonicalUrl(null);
  }

  updateCanonicalUrl(url: string | null) {
    const head = this.dom.getElementsByTagName('head')[0];
    var element: HTMLLinkElement | null = this.dom.querySelector(`link[rel='canonical']`);
    if (url) {
      if (element == null) {
        element = this.dom.createElement('link') as HTMLLinkElement;
        head.appendChild(element);
      }
      element.setAttribute('rel', 'canonical');
      element.setAttribute('href', url);
    }
  }

  setAllTags(title: string, desc: string, url: string, image: string): void {

    let shortDesc: string = desc.length > 160 ? desc.substring(0, 159) : desc

    this.titleService.setTitle(title);

    this.metaTagService.updateTag({name: 'title', content: title});
    this.metaTagService.updateTag({name: 'description', content: shortDesc});

    this.metaTagService.updateTag({property: 'og:title', content: title});
    this.metaTagService.updateTag({property: 'og:description', content: shortDesc});
    this.metaTagService.updateTag({property: 'og:url', content: url});
    this.metaTagService.updateTag({property: 'og:type', content: "website"});
    this.metaTagService.updateTag({property: 'og:image', content: "https://flosrocketbricks.com/" + image});

    this.metaTagService.updateTag({name: 'twitter:title', content: title});
    this.metaTagService.updateTag({name: 'twitter:description', content: desc});
    this.metaTagService.updateTag({name: 'twitter:url', content: url});
    this.metaTagService.updateTag({name: 'twitter:card', content: "summary_large_image"});
    this.metaTagService.updateTag({name: 'twitter:image', content: "https://flosrocketbricks.com/" + image});

    this.updateCanonicalUrl(url);
  }

  setDefaultTags(title: string, url: string): void {
    let desc: string = "A website containing instructions and digital files of MOCs by me, completely for free!";
    let image: string = "assets/logo.png";

    this.setAllTags(title, desc, url, image);
  }

  getPageMocLink(id: number, mocTitle: string): string {
    return "/moc/" + this.getPageLink(id, mocTitle);
  }

  getPageBlogLink(blog: Blog): string {
    return "/blog/" + this.getPageLink(blog.id, blog.title);
  }

  getTotalMocLink(moc: Moc): string {
    return "https://flosrocketbricks.com/moc/" + this.getPageLink(moc.id, moc.title);
  }

  getTotalBlogLink(blog: Blog): string {
    return "https://flosrocketbricks.com/blog/" + this.getPageLink(blog.id, blog.title);
  }

  private getPageLink(id: number, title: string): string {
    return id.toString() + "/" + title.toLowerCase()
        .split("/").join("-")
        .split("'").join("-")
        .split(" ").join("-")
        .split(".").join("-")
        .split("+").join("")
        .split(":").join("-")
        .split("!").join("")
        .split("--").join("-")
      + "/";
  }
}
