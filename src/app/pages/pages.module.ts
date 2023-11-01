import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from '../app-routing.module';
import { MocComponent } from './moc/moc.component';
import { SearchComponent } from './search/search.component';
import { CollectionOverviewComponent } from './collection-overview/collection-overview.component';
import { StartComponent } from './start/start.component';
import { AboutComponent } from './about/about.component';
import { BlogOverviewComponent } from './blog-overview/blog-overview.component';
import { CollectionComponent } from './collection/collection.component';
import { OrbiterComponent } from './orbiter/orbiter.component';



@NgModule({
  declarations: [
    OrbiterComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule
  ],
  exports: [
  ]
})
export class PagesModule { }
