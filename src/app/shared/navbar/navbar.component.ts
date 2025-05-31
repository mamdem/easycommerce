import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  storeName: string = 'E-boutique'; // Valeur par défaut
  
  constructor(
    private authService: AuthService,
    private storeService: StoreService
  ) {}
  
  ngOnInit(): void {
    this.loadStoreName();
  }
  
  loadStoreName(): void {
    if (this.isAuthenticated()) {
      this.storeService.getStoreSettings().subscribe(settings => {
        if (settings && settings.length > 0 && settings[0].name) {
          this.storeName = settings[0].name;
        }
      });
    }
  }
  
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  
  getUserName(): string {
    const user = this.authService.getCurrentUser();
    if (user && user.displayName) {
      return user.displayName;
    } else if (user && user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur';
  }
  
  logout(): void {
    this.authService.logout();
  }
}
