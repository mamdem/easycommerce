import { Component, OnInit } from '@angular/core';
import { StoreService, StoreSettings } from './core/services/store.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ecommerce';

  constructor(private storeService: StoreService) {}

  ngOnInit(): void {
    // Charger les paramètres de la boutique au démarrage
    this.loadStoreSettings();
  }

  loadStoreSettings(): void {
    this.storeService.getStoreSettings().subscribe(
      (settings: StoreSettings[]) => {
        if (settings && settings.length > 0) {
          // Appliquer le thème de la boutique
          this.storeService.applyStoreTheme(settings[0].primaryColor, settings[0].secondaryColor);
        }
      },
      (error) => {
        console.error('Erreur lors du chargement des paramètres de la boutique', error);
      }
    );
  }
}
