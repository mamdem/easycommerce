import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailProductStoreHomeComponent } from './detail-product-store-home.component';

describe('DetailProductStoreHomeComponent', () => {
  let component: DetailProductStoreHomeComponent;
  let fixture: ComponentFixture<DetailProductStoreHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailProductStoreHomeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailProductStoreHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
