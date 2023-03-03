import { TestBed } from '@angular/core/testing';

import { MetaServiceService } from './meta-service.service';

describe('MetaServiceService', () => {
  let service: MetaServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetaServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
