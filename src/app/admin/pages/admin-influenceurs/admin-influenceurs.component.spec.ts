import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminInfluenceursComponent } from './admin-influenceurs.component';

describe('AdminInfluenceursComponent', () => {
  let component: AdminInfluenceursComponent;
  let fixture: ComponentFixture<AdminInfluenceursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminInfluenceursComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminInfluenceursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
