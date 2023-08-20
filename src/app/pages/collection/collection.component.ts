import { Component, OnInit } from '@angular/core';
import { Collection, Moc, SubCollection } from 'src/app/model/classes';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { ActivatedRoute } from '@angular/router';
import { CollectionGrabberService } from 'src/app/services/collection-grabber.service';
import { MetaServiceService } from 'src/app/services/meta-service.service';

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.sass']
})
export class CollectionComponent implements OnInit {

  collection: Collection;

  subCollectionMocs = new Map<number, Moc[]>;

  constructor(private route: ActivatedRoute, private collectionGrabberService: CollectionGrabberService, private mocGrabberService: MocGrabberService, private metaService: MetaServiceService) {
    this.collection = new Collection(-1,"","","",[]);
   }

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      this.collection = this.collectionGrabberService.getCollection(Number(paramMap.get('id')) || 0);

      const mocs = this.mocGrabberService.getAllMocs();
      this.subCollectionMocs.clear();
      for (const subCollection of this.collection.subCollections) {
        let mocList = [];
        for (const mocId of subCollection.mocs) {
          const found = mocs.find(moc => moc.id == mocId);
          if (found)
            mocList.push(found);
        }
        this.subCollectionMocs.set(subCollection.id, mocList);
      }

      this.metaService.setAllTags(this.collection.name + " - FlosRocketBricks", this.collection.description, "https://flosrocketbricks.com/collection/" + this.collection.id.toString() + "/" + this.collection.name.toLowerCase().split(' ').join('-'), this.collection.cover);

    });
  }
}
