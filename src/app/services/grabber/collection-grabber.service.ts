import { Injectable } from '@angular/core';
import collections from '../../../assets/collections.json';
import { Collection } from '../../model/classes';

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
