import { Injectable } from '@angular/core';
import collections from '../../../assets/collections.json';
import { Observable } from 'rxjs/internal/Observable';
import { Collection } from '../../model/classes';
import { map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CollectionGrabberService {

  private collections!: Collection[];

  constructor() {
    let parsedCollectionData: Collection[] = collections;
    this.collections = parsedCollectionData;
  }

  getCollection(id: number): Collection {
    return this.collections.filter(collection => collection.id == id)[0];
  }

  getAllCollections(): Collection[] {
    return this.collections;
  }
}
