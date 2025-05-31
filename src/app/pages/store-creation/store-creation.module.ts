import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreCreationComponent } from './store-creation.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@NgModule({
  declarations: [
    StoreCreationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NavbarComponent,
    RouterModule.forChild([
      { path: '', component: StoreCreationComponent }
    ])
  ]
})
export class StoreCreationModule { } 