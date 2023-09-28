import { Injectable } from '@angular/core';
import { Moc } from '../model/classes';
import mocs from '../../assets/mocs.json';

@Injectable({
  providedIn: 'root'
})
export class MocGrabberService {

  private mocs: Moc[];

  constructor() {
    this.mocs = mocs;
    
  }

  getEmptyMoc(): Moc{
    return new Moc([], "", "", "", -1, [], "", [], -1, "", "", "", -1, -1, "", [], "", [], "", [], "", "", "", "", "", "", "", "", "", "", [], "", "", "", "")
  }

  getMoc(id: number): Moc {
    return this.mocs.filter(moc => moc.id == id)[0];
  }

  getAllMocs(): Moc[] {
    return this.mocs;
  }
}
