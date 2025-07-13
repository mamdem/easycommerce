import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  showTerms = false;
  showPrivacy = false;
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {}

  // Getters pour faciliter l'accès aux champs du formulaire
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get acceptTerms() { return this.registerForm.get('acceptTerms'); }

  // Validateur personnalisé pour la correspondance des mots de passe
  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
  }

  // Méthodes pour basculer la visibilité des mots de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
    
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Méthodes pour basculer l'affichage des conditions
  toggleTerms(): void {
    this.showTerms = !this.showTerms;
    if (this.showTerms) this.showPrivacy = false;
  }

  togglePrivacy(): void {
    this.showPrivacy = !this.showPrivacy;
    if (this.showPrivacy) this.showTerms = false;
  }

  // Soumission du formulaire
  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;

    try {
      const { email, password, firstName, lastName } = this.registerForm.value;
      const userData = {
        firstName,
        lastName,
        phoneNumber: '' // Optionnel
      };

      await this.authService.register(email, password, 'merchant', userData);
      
      this.toastService.success('Compte créé avec succès ! Vérifiez votre email et cliquez sur le lien de vérification.');
      this.router.navigate(['/auth/email-verification']);
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      this.toastService.error('Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
      this.isLoading = false;
    }
  }

  // Connexion avec Google
  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Erreur lors de la connexion avec Google:', error);
      this.toastService.error('Erreur lors de la connexion avec Google');
    }
  }
} 