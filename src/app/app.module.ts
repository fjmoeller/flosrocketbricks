import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MocComponent } from './pages/moc/moc.component';
import { SearchComponent } from './pages/search/search.component';
import { StartComponent } from './pages/start/start.component';
import { AboutComponent } from './pages/about/about.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MocGrabberService } from './services/moc-grabber.service';
import { RouterModule } from '@angular/router';
import { BlogOverviewComponent } from './pages/blog-overview/blog-overview.component';
import { IoFileService } from './services/io-file.service';
import { FileExportService } from './services/file-export.service';
import { LdrawColorService } from './services/ldraw-color.service';
import { MetaServiceService } from './services/meta-service.service';
import { CollectionComponent } from './pages/collection/collection.component';
import { ComponentsModule } from './components/components.module';
import { CollectionOverviewComponent } from './pages/collection-overview/collection-overview.component';

@NgModule({
  declarations: [
    AppComponent,
    MocComponent,
    SearchComponent,
    CollectionOverviewComponent,
    StartComponent,
    AboutComponent,
    BlogOverviewComponent,
    CollectionComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NgbTooltipModule,
    NgbModule,
    RouterModule,
    ComponentsModule
  ],
  providers: [
    MocGrabberService,
    FileExportService,
    IoFileService,
    LdrawColorService,
    MetaServiceService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
