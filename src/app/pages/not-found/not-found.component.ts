import { Component, OnInit } from '@angular/core';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.sass']
})
export class NotFoundComponent implements OnInit {

  constructor(private metaService: MetaServiceService) { }
  ngOnInit(): void {
    this.metaService.setDefaultTags("Page Not Found - FlosRocketBricks", "https://flosrocketbricks.com/404");
  }

}
