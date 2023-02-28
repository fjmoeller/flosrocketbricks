import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { filter, map, Observable } from 'rxjs';
import { Moc } from '../components/classes';

@Injectable({
  providedIn: 'root'
})
export class MocGrabberService {

  private mocs! : Observable<Moc[]>;

  constructor(private firestore: AngularFirestore) {this.mocs = this.firestore.collection<Moc>('mocs').valueChanges(); }


  getMoc(id: number): Observable<Moc> {
    return this.mocs.pipe(map(mocs => mocs.filter(moc => moc.id == id)[0]));
  }

  getAllMocs(): Observable<Moc[]> {
    return this.mocs;
  }
}
