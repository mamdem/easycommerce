import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { PromotionsComponent } from './promotions.component';
import { AddPromotionComponent } from './add-promotion/add-promotion.component';

const routes = [
  {
    path: '',
    component: PromotionsComponent
  },
  {
    path: 'ajouter',
    component: AddPromotionComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    PromotionsComponent,
    AddPromotionComponent
  ]
})
export class PromotionsModule { } 