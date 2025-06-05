import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { StoreHomeRoutingModule } from './store-home-routing.module';
import { StoreHomeComponent } from './store-home.component';
import { CartPageComponent } from './components/cart-page/cart-page.component';
import { SharedModule } from '../../../shared/shared.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    StoreHomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StoreHomeRoutingModule,
    SharedModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    CartPageComponent
  ]
})
export class StoreHomeModule { } 