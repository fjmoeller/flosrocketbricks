import { Injectable } from '@angular/core';
import { Moc } from '../../model/classes';
import mocs from '../../../assets/mocs.json';

@Injectable({
  providedIn: 'root'
})
export class MocGrabberService {

  private readonly mocs: Moc[];

  constructor() {
    this.mocs = mocs as Moc[];

  }

  getEmptyMoc(): Moc{
    return new Moc([], "", "", [], -1, [], "", [], -1, "", "", "", -1, -1, "", [], "", [], "", [], "", "", "", "", "", "", "", "", "", "", [], "", "", "", "")
  }

  getMoc(id: number): Moc | undefined {
    return this.mocs.filter(moc => moc.id == id)[0];
  }

  getAllMocs(): Moc[] {
    return this.mocs;
  }
}
