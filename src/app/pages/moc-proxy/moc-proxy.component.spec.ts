import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MocProxyComponent } from './moc-proxy.component';

describe('MocProxyComponent', () => {
  let component: MocProxyComponent;
  let fixture: ComponentFixture<MocProxyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MocProxyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MocProxyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
