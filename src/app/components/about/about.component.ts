import { Component, OnInit } from '@angular/core';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.sass']
})
export class AboutComponent implements OnInit {

  constructor(private metaService: MetaServiceService) { }

  ngOnInit(): void {
    this.metaService.setDefaultTags("About - FlosRocketBricks","https://flosrocketbricks.com/about");
  }
}