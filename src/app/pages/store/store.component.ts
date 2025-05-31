import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { StoreService, StoreSettings } from '../../core/services/store.service';

@Component({
  selector: 'app-store',
  templateUrl: './store.component.html',
  styleUrls: ['./store.component.scss'],
})
export class StoreComponent implements OnInit {
  storeId: string | null = null;
  storeData: StoreSettings | null = null;
  loading: boolean = true;
  
  private route = inject(ActivatedRoute);
  private storeService = inject(StoreService);
  
  ngOnInit(): void {
    this.loadStoreData();
  }

  loadStoreData(): void {
    // Récupérer l'ID de la boutique depuis l'URL
    this.route.paramMap.subscribe(params => {
      this.storeId = params.get('id');
      
      // Charger les données de la boutique
      this.storeService.getStoreSettings().subscribe(
        settings => {
          if (settings) {
            this.storeData = settings[0];
            
            // Appliquer les couleurs de la boutique au thème
            this.storeService.applyStoreTheme(settings[0].primaryColor, settings[0].secondaryColor);
            
            // Convertir les couleurs hex en RGB pour les utiliser dans les styles CSS
            const primaryColorRgb = this.hexToRgb(settings[0].primaryColor);
            const secondaryColorRgb = this.hexToRgb(settings[0].secondaryColor);
            
            // Définir les variables CSS
            document.documentElement.style.setProperty('--primary-color-rgb', primaryColorRgb);
            document.documentElement.style.setProperty('--secondary-color-rgb', secondaryColorRgb);
          }
          this.loading = false;
        },
        error => {
          console.error('Erreur lors du chargement des données de la boutique', error);
          this.loading = false;
        }
      );
    });
  }

  // Convertir une couleur hex en format RGB
  hexToRgb(hex: string): string {
    // Supprimer le # si présent
    hex = hex.replace(/^#/, '');
    
    // Convertir en format RGB
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    
    return `${r}, ${g}, ${b}`;
  }
} 