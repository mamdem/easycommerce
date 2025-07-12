import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AdminHomeComponent } from './pages/admin-home/admin-home.component';
import { AdminStoresComponent } from './pages/admin-stores/admin-stores.component';
import { AdminInfluenceursComponent } from './pages/admin-influenceurs/admin-influenceurs.component';
import { AdminProprietairesComponent } from './pages/admin-proprietaires/admin-proprietaires.component';

const routes: Routes = [
  {
    path: '',
    component: AdminHomeComponent,
    children: [
      {
        path: 'stores',
        component: AdminStoresComponent
      },
      {
        path: 'influenceurs',
        component: AdminInfluenceursComponent
      },
      {
        path: 'proprietaires',
        component: AdminProprietairesComponent
      },
    ]
  }
];

@NgModule({
  declarations: [
    AdminHomeComponent,
    AdminStoresComponent,
    AdminInfluenceursComponent,
    AdminProprietairesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class AdminModule { } 