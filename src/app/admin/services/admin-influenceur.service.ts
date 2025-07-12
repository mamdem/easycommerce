import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Influenceur {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  codePromo: string;
  reductionPourcentage: number;
  validiteMois: number; // Remplace dateExpiration - nombre de mois de validité par défaut 2
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  utilisations: number;
  commissionGagnee: number;
  statut: 'active' | 'inactive' | 'expired';
  dateCreation: number;
  dateModification: number;
}

// Interface pour les utilisations d'influenceurs par utilisateur
export interface InfluenceurUtilisation {
  id?: string;
  influenceurCode: string;
  userId: string;
  storeId: string;
  dateInscription: number; // Date d'inscription avec le code influenceur
  dateExpiration: number; // Date calculée = dateInscription + validiteMois
  utilisee: boolean; // Si la réduction a été utilisée
  montantReduction?: number; // Montant de la réduction appliquée
  dateUtilisation?: number; // Date d'utilisation de la réduction
}

@Injectable({
  providedIn: 'root'
})
export class AdminInfluenceurService {
  private collectionName = 'influenceurs';
  private utilisationsCollectionName = 'influenceur_utilisations';

  constructor(private firestore: AngularFirestore) {}

  /**
   * Récupère tous les influenceurs
   */
  getAllInfluenceurs(): Observable<Influenceur[]> {
    return this.firestore.collection<Influenceur>(this.collectionName, ref => 
      ref.orderBy('dateCreation', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Récupère un influenceur par ID (code promo)
   */
  getInfluenceurById(id: string): Observable<Influenceur | undefined> {
    return this.firestore.doc<Influenceur>(`${this.collectionName}/${id}`).valueChanges({ idField: 'id' });
  }

  /**
   * Récupère un influenceur par code promo
   */
  getInfluenceurByCodePromo(codePromo: string): Observable<Influenceur | undefined> {
    return this.getInfluenceurById(codePromo);
  }

  /**
   * Ajoute un nouvel influenceur avec le code promo comme ID
   */
  async addInfluenceur(influenceur: Omit<Influenceur, 'id'>): Promise<string> {
    const now = Date.now();
    const codePromo = influenceur.codePromo.toUpperCase().trim();
    
    // Vérifier si le code promo existe déjà
    const exists = await this.checkPromoCodeExistsPromise(codePromo);
    if (exists) {
      throw new Error(`Le code promo "${codePromo}" existe déjà. Veuillez en choisir un autre.`);
    }

    const influenceurData = {
      ...influenceur,
      codePromo,
      dateCreation: now,
      dateModification: now,
      utilisations: 0,
      commissionGagnee: 0,
      statut: 'active' as const
    };

    // Utiliser le code promo comme ID du document
    await this.firestore.doc(`${this.collectionName}/${codePromo}`).set(influenceurData);
    return codePromo;
  }

  /**
   * Met à jour un influenceur
   */
  async updateInfluenceur(id: string, influenceur: Partial<Influenceur>): Promise<void> {
    const updateData = {
      ...influenceur,
      dateModification: Date.now()
    };
    
    // Si le code promo est modifié, il faut créer un nouveau document et supprimer l'ancien
    if (influenceur.codePromo && influenceur.codePromo !== id) {
      const newCodePromo = influenceur.codePromo.toUpperCase().trim();
      
      // Vérifier si le nouveau code promo existe déjà
      const exists = await this.checkPromoCodeExistsPromise(newCodePromo);
      if (exists) {
        throw new Error(`Le code promo "${newCodePromo}" existe déjà. Veuillez en choisir un autre.`);
      }

      // Récupérer les données complètes de l'influenceur actuel
      const currentInfluenceur = await this.firestore.doc(`${this.collectionName}/${id}`).get().toPromise();
      if (currentInfluenceur?.exists) {
        const data = currentInfluenceur.data() as Influenceur;
        
        // Créer le nouveau document avec le nouveau code promo comme ID
        const completeData = {
          ...data,
          ...updateData,
          codePromo: newCodePromo
        };
        
        await this.firestore.doc(`${this.collectionName}/${newCodePromo}`).set(completeData);
        
        // Supprimer l'ancien document
        await this.firestore.doc(`${this.collectionName}/${id}`).delete();
      }
    } else {
      // Mise à jour normale sans changement de code promo
      await this.firestore.doc(`${this.collectionName}/${id}`).update(updateData);
    }
  }

  /**
   * Supprime un influenceur
   */
  async deleteInfluenceur(id: string): Promise<void> {
    await this.firestore.doc(`${this.collectionName}/${id}`).delete();
  }

  /**
   * Met à jour le statut d'un influenceur
   */
  async updateStatut(id: string, statut: 'active' | 'inactive' | 'expired'): Promise<void> {
    await this.updateInfluenceur(id, { statut });
  }

  /**
   * Génère un code promo basé sur le nom et prénom
   */
  generatePromoCode(nom: string, prenom: string): string {
    const cleanNom = nom.replace(/\s+/g, '').toUpperCase();
    const cleanPrenom = prenom.replace(/\s+/g, '').toUpperCase();
    return `${cleanPrenom}${cleanNom}`;
  }

  /**
   * Génère un code promo unique en ajoutant un suffixe si nécessaire
   */
  async generateUniquePromoCode(nom: string, prenom: string): Promise<string> {
    const baseCode = this.generatePromoCode(nom, prenom);
    let codePromo = baseCode;
    let counter = 1;

    // Vérifier l'unicité et ajouter un suffixe si nécessaire
    while (await this.checkPromoCodeExistsPromise(codePromo)) {
      codePromo = `${baseCode}${counter}`;
      counter++;
    }

    return codePromo;
  }

  /**
   * Vérifie si un code promo existe déjà (version Observable)
   */
  checkPromoCodeExists(codePromo: string): Observable<boolean> {
    return this.firestore.doc(`${this.collectionName}/${codePromo.toUpperCase().trim()}`).get().pipe(
      map(doc => doc.exists)
    );
  }

  /**
   * Vérifie si un code promo existe déjà (version Promise)
   */
  async checkPromoCodeExistsPromise(codePromo: string): Promise<boolean> {
    const doc = await this.firestore.doc(`${this.collectionName}/${codePromo.toUpperCase().trim()}`).get().toPromise();
    return doc?.exists || false;
  }

  /**
   * Recherche des influenceurs
   */
  searchInfluenceurs(query: string): Observable<Influenceur[]> {
    query = query.toLowerCase().trim();
    return this.getAllInfluenceurs().pipe(
      map(influenceurs => influenceurs.filter(influenceur => 
        influenceur.nom.toLowerCase().includes(query) ||
        influenceur.prenom.toLowerCase().includes(query) ||
        influenceur.email.toLowerCase().includes(query) ||
        influenceur.codePromo.toLowerCase().includes(query)
      ))
    );
  }

  /**
   * Filtre les influenceurs par statut
   */
  getInfluenceursByStatut(statut: string): Observable<Influenceur[]> {
    if (statut === 'all') {
      return this.getAllInfluenceurs();
    }
    
    return this.firestore.collection<Influenceur>(this.collectionName, ref => 
      ref.where('statut', '==', statut).orderBy('dateCreation', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Récupère les statistiques des influenceurs
   */
  getInfluenceurStatistics(): Observable<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    totalCommissions: number;
  }> {
    return this.getAllInfluenceurs().pipe(
      map(influenceurs => {
        const stats = {
          total: influenceurs.length,
          active: influenceurs.filter(inf => inf.statut === 'active').length,
          inactive: influenceurs.filter(inf => inf.statut === 'inactive').length,
          expired: influenceurs.filter(inf => inf.statut === 'expired').length,
          totalCommissions: influenceurs.reduce((total, inf) => total + (inf.commissionGagnee || 0), 0)
        };
        return stats;
      })
    );
  }

  /**
   * Crée un influenceur de test avec le code MACDIDIOP
   * Utile pour les tests de développement
   */
  async createTestInfluenceur(): Promise<string> {
    const testInfluenceur: Omit<Influenceur, 'id'> = {
      nom: 'DIOP',
      prenom: 'MAC',
      email: 'mac.diop@test.com',
      telephone: '+221 77 123 45 67',
      codePromo: 'MACDIDIOP',
      reductionPourcentage: 15,
      validiteMois: 2, // 2 mois de validité par défaut
      instagram: '@macdiop',
      tiktok: '@macdiop',
      youtube: '@macdiop',
      utilisations: 0,
      commissionGagnee: 0,
      statut: 'active',
      dateCreation: Date.now(),
      dateModification: Date.now()
    };

    try {
      return await this.addInfluenceur(testInfluenceur);
    } catch (error) {
      console.log('Influenceur de test déjà créé ou erreur:', error);
      return 'MACDIDIOP';
    }
  }

  /**
   * Enregistre l'utilisation d'un code influenceur lors de l'inscription d'un magasin
   */
  async enregistrerUtilisation(influenceurCode: string, userId: string, storeId: string): Promise<void> {
    try {
      console.log('📝 Enregistrement utilisation influenceur:', { influenceurCode, userId, storeId });
      
      const influenceur = await firstValueFrom(
        this.getInfluenceurByCodePromo(influenceurCode).pipe(
          map(inf => inf)
        )
      );

      if (!influenceur) {
        throw new Error(`Code influenceur "${influenceurCode}" non trouvé`);
      }

      const now = Date.now();
      const dateExpiration = now + (influenceur.validiteMois * 30 * 24 * 60 * 60 * 1000); // validiteMois en millisecondes

      const utilisation: InfluenceurUtilisation = {
        influenceurCode: influenceurCode,
        userId: userId,
        storeId: storeId,
        dateInscription: now,
        dateExpiration: dateExpiration,
        utilisee: false
      };

      // Sauvegarder l'utilisation
      await this.firestore.collection(this.utilisationsCollectionName).add(utilisation);
      console.log('✅ Utilisation sauvegardée');

      // Incrémenter le compteur d'utilisations de l'influenceur
      await this.incrementUtilisations(influenceurCode);
      console.log('✅ Compteur d\'utilisations incrémenté');
      
    } catch (error) {
      console.error('❌ Erreur dans enregistrerUtilisation:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur peut encore bénéficier d'une réduction d'un influenceur
   */
  async peutBeneficierReduction(influenceurCode: string, userId: string): Promise<{
    eligible: boolean;
    utilisation?: InfluenceurUtilisation;
    influenceur?: Influenceur;
  }> {
    try {
      // Récupérer l'utilisation de ce code pour cet utilisateur
      const utilisationQuery = await this.firestore.collection<InfluenceurUtilisation>(
        this.utilisationsCollectionName,
        ref => ref
          .where('influenceurCode', '==', influenceurCode.toUpperCase())
          .where('userId', '==', userId)
          .limit(1)
      ).get().toPromise();

      if (!utilisationQuery || utilisationQuery.empty) {
        return { eligible: false }; // L'utilisateur n'a jamais utilisé ce code
      }

      const utilisation = { id: utilisationQuery.docs[0].id, ...utilisationQuery.docs[0].data() };
      const now = Date.now();

      // Vérifier si la période de validité n'est pas expirée
      if (now > utilisation.dateExpiration) {
        return { eligible: false, utilisation }; // La période de validité est expirée
      }

      // Vérifier si la réduction n'a pas déjà été utilisée
      if (utilisation.utilisee) {
        return { eligible: false, utilisation }; // La réduction a déjà été utilisée
      }

      // Récupérer les informations de l'influenceur
      const influenceur = await firstValueFrom(
        this.getInfluenceurByCodePromo(influenceurCode).pipe(
          map(inf => inf)
        )
      );

      return {
        eligible: true,
        utilisation: utilisation,
        influenceur: influenceur
      };
    } catch (error) {
      console.error('❌ Erreur dans peutBeneficierReduction:', error);
      return { eligible: false };
    }
  }

  /**
   * Marque une réduction comme utilisée
   */
  async marquerReductionUtilisee(influenceurCode: string, userId: string, montantReduction: number): Promise<void> {
    const utilisationQuery = await this.firestore.collection<InfluenceurUtilisation>(
      this.utilisationsCollectionName,
      ref => ref
        .where('influenceurCode', '==', influenceurCode.toUpperCase())
        .where('userId', '==', userId)
        .limit(1)
    ).get().toPromise();

    if (!utilisationQuery || utilisationQuery.empty) {
      throw new Error('Utilisation non trouvée');
    }

    const utilisationId = utilisationQuery.docs[0].id;
    await this.firestore.doc(`${this.utilisationsCollectionName}/${utilisationId}`).update({
      utilisee: true,
      montantReduction: montantReduction,
      dateUtilisation: Date.now()
    });

    // Mettre à jour la commission gagnée de l'influenceur
    const commission = montantReduction * 0.1; // 10% de commission par exemple
    await this.ajouterCommission(influenceurCode, commission);
  }

  /**
   * Incrémente le nombre d'utilisations d'un influenceur
   */
  private async incrementUtilisations(codePromo: string): Promise<void> {
    const influenceurRef = this.firestore.doc(`${this.collectionName}/${codePromo.toUpperCase()}`);
    const doc = await influenceurRef.get().toPromise();
    
    if (doc?.exists) {
      const currentData = doc.data() as Influenceur;
      await influenceurRef.update({
        utilisations: (currentData.utilisations || 0) + 1,
        dateModification: Date.now()
      });
    }
  }

  /**
   * Ajoute une commission à un influenceur
   */
  private async ajouterCommission(codePromo: string, commission: number): Promise<void> {
    const influenceurRef = this.firestore.doc(`${this.collectionName}/${codePromo.toUpperCase()}`);
    const doc = await influenceurRef.get().toPromise();
    
    if (doc?.exists) {
      const currentData = doc.data() as Influenceur;
      await influenceurRef.update({
        commissionGagnee: (currentData.commissionGagnee || 0) + commission,
        dateModification: Date.now()
      });
    }
  }

  /**
   * Récupère toutes les utilisations d'un influenceur
   */
  getUtilisationsInfluenceur(influenceurCode: string): Observable<InfluenceurUtilisation[]> {
    return this.firestore.collection<InfluenceurUtilisation>(
      this.utilisationsCollectionName,
      ref => ref
        .where('influenceurCode', '==', influenceurCode.toUpperCase())
        .orderBy('dateInscription', 'desc')
    ).valueChanges({ idField: 'id' });
  }
} 