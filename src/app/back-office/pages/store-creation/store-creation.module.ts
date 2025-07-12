import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreCreationComponent } from './store-creation.component';
import { StoreCreationRoutingModule } from './store-creation-routing.module';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@NgModule({
  declarations: [
    StoreCreationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NavbarComponent,
    StoreCreationRoutingModule  // Utiliser le module de routage dédié au lieu de la configuration inline
  ]
})
export class StoreCreationModule { } 