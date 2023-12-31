import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MocComponent } from './pages/moc/moc.component';
import { AboutComponent } from './pages/about/about.component';
import { SearchComponent } from './pages/search/search.component';
import { StartComponent } from './pages/start/start.component';
import { BlogOverviewComponent } from './pages/blog-overview/blog-overview.component';
import { CollectionComponent } from './pages/collection/collection.component';
import { CollectionOverviewComponent } from './pages/collection-overview/collection-overview.component';
import { Location } from '@angular/common';
import { OrbiterComponent } from './pages/orbiter/orbiter.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

const __stripTrailingSlash = (Location as any).stripTrailingSlash;
(Location as any).stripTrailingSlash = function _stripTrailingSlash(url: string): string {
  const queryString$ = url.match(/([^?]*)?(.*)/);
  if (queryString$ != null && queryString$[2].length > 0) {
    return /[^\/]\/$/.test(queryString$[1]) ? queryString$[1] + '.' + queryString$[2] : __stripTrailingSlash(url);
  }
  return /[^\/]\/$/.test(url) ? url + '.' : __stripTrailingSlash(url);
};

const routes: Routes = [
  { path: 'moc/:id/:name/.', component: MocComponent },
  { path: 'about/.', component: AboutComponent },
  { path: 'search/.', component: SearchComponent },
  { path: 'start/.', component: StartComponent },
  { path: 'blogs/.', component: BlogOverviewComponent },
  { path: 'collections/.', component: CollectionOverviewComponent },
  { path: 'collection/:id/:name/.', component: CollectionComponent },
  { path: 'orbiter/.', component: OrbiterComponent },
  { path: '', component: StartComponent },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking', scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }