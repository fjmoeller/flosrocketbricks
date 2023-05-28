import { Component, OnInit } from '@angular/core';
import { Collection } from 'src/app/model/classes';
import { CollectionGrabberService } from 'src/app/services/collection-grabber.service';

@Component({
  selector: 'app-collection-overview',
  templateUrl: './collection-overview.component.html',
  styleUrls: ['./collection-overview.component.sass']
})
export class CollectionOverviewComponent implements OnInit {

  collections: Collection[] = [];

  constructor(private collectionGrabberService: CollectionGrabberService) { }

  ngOnInit(): void {
    this.collections = this.collectionGrabberService.getAllCollections().sort((a: Collection, b: Collection) => b.name < a.name ? 1 : -1);
  }

}
