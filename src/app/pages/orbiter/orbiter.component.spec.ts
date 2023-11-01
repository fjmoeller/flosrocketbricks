import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrbiterComponent } from './orbiter.component';

describe('OrbiterComponent', () => {
  let component: OrbiterComponent;
  let fixture: ComponentFixture<OrbiterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OrbiterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrbiterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
