import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.sass']
})
export class BlogComponent implements OnInit {

  showViewer = true;

  viewerLink = "https://bricksafe.com/files/SkySaac/website/test/model.io";

  constructor() { }

  ngOnInit(): void {
  }

}
