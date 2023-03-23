import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { Moc } from '../components/classes';
import mocs from '../../assets/mocs.json';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MocGrabberService {

  private mocs! : Observable<Moc[]>;

  constructor() {

    let parsedMocData : Moc[] = mocs;
    console.log(parsedMocData[0])
    this.mocs = of(parsedMocData).pipe(tap(moc => console.log("Mocs received:",moc.length)));
  }

  getMoc(id: number): Observable<Moc> {
    return this.mocs.pipe(map(mocs => mocs.filter(moc => moc.id == id)[0]));
  }

  getAllMocs(): Observable<Moc[]> {
    return this.mocs;
  }
}
