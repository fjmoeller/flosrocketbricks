import { Component, OnInit } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {

  constructor(private metaTagService: Meta) {

  }

  ngOnInit(): void {
    this.metaTagService.addTags([
      { name: 'robots', content: 'index, follow' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { charset: 'UTF-8' }
    ]);

  }
  title = 'FlosRocketBricks';
}