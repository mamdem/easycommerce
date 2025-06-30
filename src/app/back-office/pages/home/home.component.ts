import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService, StoreSettings } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private storeService = inject(StoreService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // Liste des boutiques de l'utilisateur
  userStores: StoreSettings[] = [];
  loading: boolean = false;
  currentYear: number = new Date().getFullYear();
  
  // Propriétés pour les slides du carousel
  slides = [
    {
      image: 'assets/images/slide1.jpg',
      title: 'Créez votre boutique en ligne',
      description: 'Lancez votre business numérique en quelques clics',
      buttonText: 'Commencer',
      buttonLink: '/auth/register'
    },
    {
      image: 'assets/images/slide2.jpg',
      title: 'Gérez vos produits facilement',
      description: 'Interface intuitive pour administrer votre catalogue',
      buttonText: 'En savoir plus',
      buttonLink: '/features'
    },
    {
      image: 'assets/images/slide3.jpg',
      title: 'Analysez vos performances',
      description: 'Statistiques détaillées pour optimiser vos ventes',
      buttonText: 'Voir les statistiques',
      buttonLink: '/features#stats'
    }
  ];

  // Propriétés pour les fonctionnalités
  features = [
    {
      icon: 'bi-shop-window',
      title: 'Boutique personnalisable',
      description: 'Créez une boutique unique avec votre propre marque et design'
    },
    {
      icon: 'bi-graph-up',
      title: 'Analyses détaillées',
      description: 'Suivez vos performances avec des statistiques en temps réel'
    },
    {
      icon: 'bi-cart-check',
      title: 'Gestion des commandes',
      description: 'Gérez facilement vos commandes et votre inventaire'
    },
    {
      icon: 'bi-phone',
      title: '100% responsive',
      description: 'Une expérience optimale sur tous les appareils'
    }
  ];

  // Propriétés pour les témoignages
  testimonials = [
    {
      name: 'Marie Dupont',
      business: 'Boutique Mode Éthique',
      quote: 'Grâce à cette plateforme, j\'ai pu créer ma boutique en ligne en quelques heures seulement. Les ventes ont décollé dès le premier mois !',
      image: 'assets/images/testimonial1.jpg'
    },
    {
      name: 'Jean Martin',
      business: 'Artisanat Local',
      quote: 'L\'interface est intuitive et les outils statistiques m\'aident à comprendre quels produits fonctionnent le mieux. Un vrai plus pour mon business.',
      image: 'assets/images/testimonial2.jpg'
    },
    {
      name: 'Sophie Leclerc',
      business: 'Cosmétiques Bio',
      quote: 'Le support client est excellent et les mises à jour régulières apportent toujours de nouvelles fonctionnalités utiles. Je recommande vivement.',
      image: 'assets/images/testimonial3.jpg'
    }
  ];

  // Étapes
  steps = [
    {
      number: 1,
      title: 'Créez votre compte',
      description: 'Inscrivez-vous gratuitement et accédez à votre espace personnel'
    },
    {
      number: 2,
      title: 'Personnalisez votre boutique',
      description: 'Ajoutez vos produits et personnalisez votre design'
    },
    {
      number: 3,
      title: 'Commencez à vendre',
      description: 'Partagez votre boutique et recevez vos premières commandes'
    }
  ];

  ngOnInit(): void {
    this.checkAuthStatus();
    if (this.isLoggedIn() && this.isMerchant()) {
      this.loadUserStores();
    }
  }

  // Charger les boutiques de l'utilisateur
  loadUserStores(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && currentUser.uid) {
      this.storeService.getStoreSettings().subscribe({
        next: (stores) => {
          this.userStores = stores;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des boutiques:', error);
          this.loading = false;
        }
      });
    }
  }

  // Obtenir l'avatar de l'utilisateur
  getUserAvatar(): string {
    const user = this.authService.getCurrentUser();
    return user?.photoURL || 'assets/default-avatar.svg';
  }

  // Naviguer vers le dashboard d'une boutique spécifique
  navigateToStoreDashboard(storeId: string): void {
    if (!storeId) {
      this.toastService.error('ID de boutique invalide');
      return;
    }
    localStorage.setItem('selectedStoreId', storeId);
    this.router.navigate(['/dashboard']);
  }

  // Naviguer vers la création d'une nouvelle boutique
  createNewStore(): void {
    this.router.navigate(['/store-creation']);
  }

  // Vérifier le statut d'authentification
  checkAuthStatus(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user?.userType === 'merchant' && user?.hasStore) {
        this.loadUserStores();
      }
    }
  }

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  // Vérifier si l'utilisateur est un marchand
  isMerchant(): boolean {
    return this.authService.isMerchant();
  }

  // Vérifier si l'utilisateur a une boutique
  hasStore(): boolean {
    return this.authService.hasStore();
  }

  // Récupérer le nom de l'utilisateur
  getUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.displayName || user?.email?.split('@')[0] || 'Utilisateur';
  }

  // Méthode pour vérifier et stocker en cache le statut de l'utilisateur
  // Évite les appels multiples aux méthodes qui peuvent créer une boucle
  setUserStatus(): { isMerchant: boolean, hasStore: boolean } {
    const isMerchant = this.authService.isMerchant();
    const hasStore = this.authService.hasStore();
    return { isMerchant, hasStore };
  }

  // Rediriger vers la page de création de boutique
  goToStoreCreation(): void {
    this.router.navigate(['/store-creation']);
  }
  
  // Méthode pour se déconnecter
  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  navigateToDashboard(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  // Méthode pour le défilement fluide
  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
} 