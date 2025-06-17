import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PromotionsComponent } from './promotions.component';
import { AddPromotionComponent } from './add-promotion/add-promotion.component';

const routes: Routes = [
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
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PromotionsRoutingModule { } 