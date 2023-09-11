import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MocComponent } from './pages/moc/moc.component';
import { AboutComponent } from './pages/about/about.component';
import { SearchComponent } from './pages/search/search.component';
import { StartComponent } from './pages/start/start.component';
import { BlogOverviewComponent } from './pages/blog-overview/blog-overview.component';
import { CollectionComponent } from './pages/collection/collection.component';
import { CollectionOverviewComponent } from './pages/collection-overview/collection-overview.component';

const routes: Routes = [
  { path: 'moc/:id/:name', component: MocComponent },
  { path: 'about', component: AboutComponent },
  { path: 'search', component: SearchComponent },
  { path: 'start', component: StartComponent },
  { path: 'blogs', component: BlogOverviewComponent },
  { path: 'collections', component: CollectionOverviewComponent },
  { path: 'collection/:id/:name', component: CollectionComponent },
  { path: '**', component: StartComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking', scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
