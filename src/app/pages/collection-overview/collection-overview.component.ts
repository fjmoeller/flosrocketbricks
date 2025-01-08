import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Collection } from 'src/app/model/classes';
import { CollectionGrabberService } from 'src/app/services/grabber/collection-grabber.service';
import { MetaService } from 'src/app/services/meta.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-collection-overview',
  templateUrl: './collection-overview.component.html',
  styleUrls: ['./collection-overview.component.sass']
})
export class CollectionOverviewComponent implements OnInit {

  collections: Collection[] = [];

  constructor(private collectionGrabberService: CollectionGrabberService, private metaService: MetaService) { }

  ngOnInit(): void {
    this.collections = this.collectionGrabberService.getAllCollections().sort((a: Collection, b: Collection) => b.name < a.name ? 1 : -1);
    this.metaService.setDefaultTags("Collections - FlosRocketBricks", "https://flosrocketbricks.com/collections/");
  }

}
