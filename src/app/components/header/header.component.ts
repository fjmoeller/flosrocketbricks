import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.sass']
})
export class HeaderComponent{

  searchInput: string = "";
  tags: string = "";

  constructor(@Inject(DOCUMENT) document: Document) { }

  triggerSearch(e: Event) {
    document.getElementById("searchButton")?.click();
  }

}
