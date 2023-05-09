import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { Moc } from '../model/classes';
import mocs from '../../assets/mocs.json';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MocGrabberService {

  private mocs!: Observable<Moc[]>;

  constructor() {
    let parsedMocData: Moc[] = mocs;
    this.mocs = of(parsedMocData);
  }


  getMoc(id: number): Observable<Moc> {
    return this.mocs.pipe(map(mocs => mocs.filter(moc => moc.id == id)[0]));
  }

  getAllMocs(): Observable<Moc[]> {
    return this.mocs;
  }
}
