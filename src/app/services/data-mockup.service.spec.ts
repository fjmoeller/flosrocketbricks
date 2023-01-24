import { TestBed } from '@angular/core/testing';

import { DataMockupService } from './data-mockup.service';

describe('DataMockupService', () => {
  let service: DataMockupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataMockupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
