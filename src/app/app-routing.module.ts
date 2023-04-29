import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MocComponent} from './components/moc/moc.component';
import { AboutComponent } from './components/about/about.component';
import { SearchComponent } from './components/search/search.component';
import { StartComponent } from './components/start/start.component';
import { MocProxyComponent } from './components/moc-proxy/moc-proxy.component';
import { ViewerComponent } from './components/viewer/viewer.component';

const routes: Routes = [
  { path: 'moc/:id/:name', component: MocComponent },
  { path: 'moc/:id', component: MocProxyComponent },
  { path: 'about', component: AboutComponent },
  { path: 'search', component: SearchComponent },
  { path: 'start', component: StartComponent },
  { path: '**', component: StartComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking'
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
