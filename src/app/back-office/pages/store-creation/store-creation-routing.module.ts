import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreCreationComponent } from './store-creation.component';

const routes: Routes = [
  {
    path: '',
    component: StoreCreationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoreCreationRoutingModule { } 