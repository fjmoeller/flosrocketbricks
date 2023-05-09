import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MocComponent } from './moc.component';

describe('MocComponent', () => {
  let component: MocComponent;
  let fixture: ComponentFixture<MocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MocComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
