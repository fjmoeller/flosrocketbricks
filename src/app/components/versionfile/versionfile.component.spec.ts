import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersionfileComponent } from './versionfile.component';

describe('VersionfileComponent', () => {
  let component: VersionfileComponent;
  let fixture: ComponentFixture<VersionfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VersionfileComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VersionfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
