import { Routes } from '@angular/router';
import { MocComponent } from './pages/moc/moc.component';
import { AboutComponent } from './pages/about/about.component';
import { SearchComponent } from './pages/search/search.component';
import { StartComponent } from './pages/start/start.component';
import { BlogOverviewComponent } from './pages/blog-overview/blog-overview.component';
import { CollectionOverviewComponent } from './pages/collection-overview/collection-overview.component';
import { CollectionComponent } from './pages/collection/collection.component';
import { OrbiterComponent } from './pages/orbiter/orbiter.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
    { path: 'moc/:id/:name/.', component: MocComponent },
    { path: 'about/.', component: AboutComponent },
    { path: 'search/.', component: SearchComponent },
    { path: 'start/.', component: StartComponent },
    { path: 'blogs/.', component: BlogOverviewComponent },
    { path: 'collections/.', component: CollectionOverviewComponent },
    { path: 'collection/:id/:name/.', component: CollectionComponent },
    { path: 'orbiter/.', component: OrbiterComponent },
    { path: '404/.', component: NotFoundComponent },
    { path: '', component: StartComponent },
    { path: '**', redirectTo: '/404/.' }
  ];
