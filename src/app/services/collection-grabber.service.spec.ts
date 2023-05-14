import { TestBed } from '@angular/core/testing';

import { CollectionGrabberService } from './collection-grabber.service';

describe('CollectionGrabberService', () => {
  let service: CollectionGrabberService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollectionGrabberService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
