import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AdminStoreService, AdminDashboardStats } from '../../services/admin-store.service';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.scss']
})
export class AdminHomeComponent implements OnInit, OnDestroy {
  // État du menu mobile
  isMobileMenuOpen = false;
  
  // Statistiques du dashboard
  dashboardStats: AdminDashboardStats = {
    totalStores: 0,
    totalUsers: 0,
    totalCustomers: 0,
    storesChange: 0,
    usersChange: 0,
    customersChange: 0
  };
  
  // Loading state
  isLoading = true;
  
  // État de la route enfant
  hasChildRoute = false;
  
  // Subject pour gérer les souscriptions
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private adminService: AdminStoreService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.detectChildRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Détecte si une route enfant est active
   */
  private detectChildRoute(): void {
    // Vérifier l'état initial
    this.hasChildRoute = this.router.url.includes('/stores') || 
                        this.router.url.includes('/influenceurs') || 
                        this.router.url.includes('/proprietaires');

    // Écouter les changements de navigation
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.hasChildRoute = event.url.includes('/stores') || 
                           event.url.includes('/influenceurs') || 
                           event.url.includes('/proprietaires');
      });
  }

  /**
   * Charge les statistiques du dashboard
   */
  private loadDashboardStats(): void {
    this.isLoading = true;
    
    this.adminService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dashboardStats = stats;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Méthode pour basculer le menu mobile
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  /**
   * Méthode pour la déconnexion
   */
  logout(): void {
    // Ajoutez ici votre logique de déconnexion
    this.router.navigate(['/login']);
  }

  /**
   * Formate les changements en pourcentage
   */
  formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
  }

  /**
   * Détermine la classe CSS pour les tendances
   */
  getTrendClass(change: number): string {
    return change >= 0 ? 'up' : 'down';
  }

  /**
   * Détermine l'icône pour les tendances
   */
  getTrendIcon(change: number): string {
    return change >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right';
  }
} 