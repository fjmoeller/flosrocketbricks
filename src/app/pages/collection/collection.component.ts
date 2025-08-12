import { Component, OnInit } from '@angular/core';
import { Collection, Moc } from 'src/app/model/classes';
import { MocGrabberService } from 'src/app/services/grabber/moc-grabber.service';
import { CollectionGrabberService } from 'src/app/services/grabber/collection-grabber.service';
import { MetaService } from 'src/app/services/meta.service';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from 'src/app/components/card/card.component';
import {CommentSectionComponent} from "../../components/comment-section/comment-section.component";

@Component({
  standalone: true,
    imports: [CardComponent, CommentSectionComponent],
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.sass']
})
export class CollectionComponent implements OnInit {

  collection: Collection;

  subCollectionMocs = new Map<number, Moc[]>;

  constructor(private route: ActivatedRoute,private collectionGrabberService: CollectionGrabberService, private mocGrabberService: MocGrabberService, private metaService: MetaService) {
    this.collection = new Collection(-1, "", "", "", []);
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

      this.metaService.setAllTags(this.collection.name + " - FlosRocketBricks", this.collection.description, "https://flosrocketbricks.com/collection/" + this.collection.id.toString() + "/" + this.collection.name.toLowerCase().split(' ').join('-') + "/", "https://flosrocketbricks.com/" + this.collection.cover);
    });
  }
}
