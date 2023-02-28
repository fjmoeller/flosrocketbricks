import { TestBed } from '@angular/core/testing';

import { MocGrabberService } from './moc-grabber.service';

describe('MocGrabberService', () => {
  let service: MocGrabberService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MocGrabberService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
