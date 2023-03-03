import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MocComponent} from './components/moc/moc.component';
import { AboutComponent } from './components/about/about.component';
import { SearchComponent } from './components/search/search.component';
import { StartComponent } from './components/start/start.component';

const routes: Routes = [
  { path: 'moc/:id', component: MocComponent },
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
