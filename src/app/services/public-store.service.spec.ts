import { TestBed } from '@angular/core/testing';

import { PublicStoreService } from './public-store.service';

describe('PublicStoreService', () => {
  let service: PublicStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PublicStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
