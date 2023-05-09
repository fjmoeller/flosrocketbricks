import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MocComponent} from './pages/moc/moc.component';
import { AboutComponent } from './pages/about/about.component';
import { SearchComponent } from './pages/search/search.component';
import { StartComponent } from './pages/start/start.component';
import { MocProxyComponent } from './components/moc-proxy/moc-proxy.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { BlogOverviewComponent } from './pages/blog-overview/blog-overview.component';

const routes: Routes = [
  { path: 'moc/:id/:name', component: MocComponent },
  { path: 'moc/:id', component: MocProxyComponent },
  { path: 'about', component: AboutComponent },
  { path: 'search', component: SearchComponent },
  { path: 'start', component: StartComponent },
  { path: 'blogs', component: BlogOverviewComponent },
  { path: '**', component: StartComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking'
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
