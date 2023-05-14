import { Injectable } from '@angular/core';
import collections from '../../assets/collections.json';
import { Observable } from 'rxjs/internal/Observable';
import { Collection } from '../model/classes';
import { map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CollectionGrabberService {

  private collections!: Observable<Collection[]>;

  constructor() {
    let parsedCollectionData: Collection[] = collections;
    this.collections = of(parsedCollectionData);
  }


  getCollection(id: number): Observable<Collection> {
    return this.collections.pipe(map(collections => collections.filter(collection => collection.id == id)[0]));
  }

  getAllCollections(): Observable<Collection[]> {
    return this.collections;
  }
}
