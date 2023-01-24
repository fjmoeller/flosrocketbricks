import { Injectable } from '@angular/core';
import { Moc } from '../components/classes';
import { HttpClient, HttpParams } from '@angular/common/http';
import { retry, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  baseUrl : string = "https://api.npms.io/v2/invalid-url"

  constructor(private http: HttpClient) { }

  getMocs(searchPath: string, filterTags: string[]): Observable<Moc[]> {

    let idUrl = this.baseUrl + "/search";

    let queryParams = new HttpParams();
    queryParams = queryParams.append("q",searchPath);
    filterTags.forEach(tag => {
      queryParams = queryParams.append('tags', tag);
    });

    return this.http.get<Moc[]>(idUrl,{params:queryParams});
  }

  getMoc(id: number): Observable<Moc> {

    let idUrl = this.baseUrl + "/moc/"+id;

    return this.http.get<Moc>(idUrl);
  }

  handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Get client-side error
      errorMessage = error.error.message;
    } else {
      // Get server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    window.alert(errorMessage);
    return throwError(() => {
      return errorMessage;
    });
  }
}
