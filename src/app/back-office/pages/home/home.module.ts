import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';
import { FormsModule } from '@angular/forms';
@NgModule({
  declarations: [
    //HomeComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  exports: [
  ]
})
export class HomeModule { }
