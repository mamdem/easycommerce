import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '../../../../core/models/store.model';
import { StoreService } from '../../../../core/services/store.service';
import { StoreNavbarComponent } from '../../../components/store-navbar/store-navbar.component';
import { StoreFooterComponent } from '../../../components/store-footer/store-footer.component';

declare var google: any;

@Component({
  selector: 'app-store-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, StoreNavbarComponent, StoreFooterComponent],
  templateUrl: './store-contact.component.html',
  styleUrls: ['./store-contact.component.scss']
})
export class StoreContactComponent implements OnInit, AfterViewInit {
  store: Store | null = null;
  storeUrl: string = '';
  storeStyle: any = {};
  @ViewChild('mapElement') mapElement!: ElementRef;
  
  private map: any;
  mapError: string | null = null;
  isMapInitialized = false;

  constructor(private storeService: StoreService) {
    // Get store URL from current path
    const urlParts = window.location.pathname.split('/');
    const boutiqueIndex = urlParts.indexOf('boutique');
    if (boutiqueIndex !== -1 && urlParts[boutiqueIndex + 1]) {
      this.storeUrl = urlParts[boutiqueIndex + 1];
      this.loadStore();
    }
  }

  ngOnInit(): void {
    this.loadStoreData();
  }

  private loadStore() {
    if (this.storeUrl) {
      this.storeService.getStoreByUrl(this.storeUrl).subscribe(store => {
        if (store) {
          this.store = store;
          this.updateStoreStyle();
          if (this.mapElement) {
            this.initMap();
          }
        }
      });
    }
  }

  private updateStoreStyle() {
    if (this.store) {
      this.storeStyle = {
        '--store-primary-color': this.store.primaryColor || '#3498db',
        '--store-secondary-color': this.store.secondaryColor || '#2ecc71',
        '--store-primary-rgb': this.hexToRgb(this.store.primaryColor || '#3498db'),
        '--store-secondary-rgb': this.hexToRgb(this.store.secondaryColor || '#2ecc71'),
        '--store-bg-color': '#ffffff',
        '--store-bg-light': '#f8f9fa',
        '--store-text-color': '#1a1a1a'
      };
    }
  }

  private hexToRgb(hex: string): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  private loadStoreData(): void {
    this.storeService.getStoreInfo().subscribe({
      next: (storeData) => {
        this.store = storeData;
        if (this.mapElement) {
          this.initMap();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données du magasin:', error);
        this.mapError = "Impossible de charger les données du magasin.";
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.store) {
      this.initMap();
    }
  }

  private initMap(): void {
    if (!this.store || this.isMapInitialized) {
      return;
    }

    if (!this.store.latitude || !this.store.longitude) {
      this.mapError = "Les coordonnées de la boutique ne sont pas disponibles.";
      return;
    }

    try {
      if (typeof google === 'undefined') {
        this.mapError = "L'API Google Maps n'est pas chargée correctement. Veuillez vérifier votre clé API et les restrictions.";
        console.error("Google Maps n'est pas défini. Vérifiez que la clé API est valide et correctement configurée.");
        return;
      }

      const storeLocation = {
        lat: this.store.latitude,
        lng: this.store.longitude
      };

      const mapOptions = {
        center: storeLocation,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        mapTypeControl: false,
        streetViewControl: true
      };

      // Initialiser la carte
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
      this.isMapInitialized = true;

      // Ajouter le marqueur
      const marker = new google.maps.Marker({
        position: storeLocation,
        map: this.map,
        title: this.store.storeName
      });

      // Ajouter une infowindow
      const infowindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 5px 0; color: #2c3e50;">${this.store.storeName}</h3>
            <p style="margin: 0; color: #666;">${this.store.address}</p>
            <p style="margin: 5px 0 0 0; color: #666;">${this.store.city}, ${this.store.zipCode}</p>
          </div>
        `
      });

      // Ouvrir l'infowindow au clic sur le marqueur
      marker.addListener('click', () => {
        infowindow.open(this.map, marker);
      });

      // Ouvrir l'infowindow par défaut
      infowindow.open(this.map, marker);

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.mapError = "Une erreur s'est produite lors du chargement de la carte. Vérifiez votre clé API Google Maps.";
    }
  }
}
