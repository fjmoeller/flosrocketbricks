import { Component, OnInit } from '@angular/core';
import { Collection, Moc, SubCollection } from 'src/app/model/classes';
import { MocGrabberService } from 'src/app/services/moc-grabber.service';
import { CardComponent } from '../../components/card/card.component';
import { ActivatedRoute } from '@angular/router';
import { CollectionGrabberService } from 'src/app/services/collection-grabber.service';

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.sass']
})
export class CollectionComponent implements OnInit {

  collectionId: number = -1;

  collection: Collection = new Collection(-1, "NAME", "DESCRIPTION", []);

  subCollectionMocs = new Map<number, Moc[]>;

  constructor(private route: ActivatedRoute, private collectionGrabberService: CollectionGrabberService, private mocGrabberService: MocGrabberService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      this.collectionId = Number(paramMap.get('id')) || 0;
      this.collectionGrabberService.getCollection(this.collectionId).subscribe(collection => {
        this.collection = collection; // get collection from id
        this.mocGrabberService.getAllMocs().subscribe(mocs => {
          this.subCollectionMocs.clear();
          for(const subCollection of this.collection.subCollections){
            let mocList = [];
            for (const mocId of subCollection.mocs) {
              const found = mocs.find(moc => moc.id == mocId);
              console.log("found mocid:" + mocId);
              if (found)
                mocList.push(found);
            }
            this.subCollectionMocs.set(subCollection.id, mocList);
          }
        });
      });
    });
  }
}
