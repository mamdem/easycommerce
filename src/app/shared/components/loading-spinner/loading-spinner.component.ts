import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class.full-page]="fullPage">
      <div class="loading-content">
        <div class="spinner-grow" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
        <p class="loading-text">{{ text }}</p>
        <div class="loading-progress" *ngIf="showProgress">
          <div class="progress" style="height: 4px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                 role="progressbar" 
                 style="width: 100%"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      padding: 2rem;
      text-align: center;
    }

    .loading-container.full-page {
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 300px;
      width: 100%;
      margin: 0 auto;
    }
    
    .spinner-grow {
      width: 2.5rem;
      height: 2.5rem;
      color: var(--secondary-color);
    }

    .full-page .spinner-grow {
      width: 3rem;
      height: 3rem;
    }
    
    .loading-text {
      font-size: 1rem;
      color: #6c757d;
      margin: 0;
    }

    .loading-progress {
      width: 100%;
      margin-top: 0.5rem;
    }
    
    .progress {
      background-color: rgba(var(--secondary-color-rgb), 0.1);
    }
    
    .progress-bar {
      background-color: var(--secondary-color);
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() text = 'Chargement...';
  @Input() showProgress = false;
  @Input() fullPage = false;
} 