import { TestBed } from '@angular/core/testing';

import { LdrawColorService } from './ldraw-color.service';

describe('LdrawColorService', () => {
  let service: LdrawColorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LdrawColorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
