# Déploiement automatique d'une application AstroJS sur Ubuntu avec GitHub Actions

## 1. Objectif

Cette procédure met en place un **déploiement automatique (Coninious Integration / Continious Deployement) après chaque `push` sur la branche `main`** d'une application AstroJS stockée sur GitHub vers un serveur Ubuntu distant.

> ** P.S. Les mises à jours des BDD sont un processus à part qui ne doit pas être géré via GitHub **

On utilisera pour cela les GitHub Actions qui se chargeront de :

1. détecter le `push` ;
2. se connecter en SSH au serveur Ubuntu ;
3. récupérer la dernière version du dépôt GitHub ;
4. installer les dépendances **sur le serveur** ;
5. construire l'application AstroJS **sur le serveur** ;
6. redémarrer l'application ;
7. vérifier qu'elle fonctionne.

L'architecture est donc :

```text
                       GITHUB
┌─────────────────────────────────────────────┐
│                                             │
│  Dépôt GitHub                               │
│       │                                     │
│       │ git push                            │
│       ▼                                     │
│  GitHub Actions                             │
│       │                                     │
│       │ SSH                                 │
└───────┼─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│              SERVEUR UBUNTU                 │
│                                             │
│  /var/www/mon-app                           │
│       │                                     │
│       ├── git pull                          │
│       ├── npm ci                            │
│       ├── npm run build                     │
│       │                                     │
│       ▼                                     │
│     dist/                                   │
│       │                                     │
│       ▼                                     │
│  systemd → Node.js → Astro SSR              │
│       │                                     │
│       ▼                                     │
│  Apache/Nginx                               │
│       │                                     │
└───────┼─────────────────────────────────────┘
        │
        ▼
     Internet
```

Cette architecture est particulièrement intéressante lorsque l'on souhaite que **l'environnement de production soit responsable de l'installation et de la compilation**, et que GitHub serve uniquement de dépôt de code et de déclencheur du déploiement.

Astro documente l'utilisation de `@astrojs/node` pour les applications rendues côté serveur. En mode `standalone`, l'adaptateur produit notamment `dist/server/entry.mjs`, qui peut être lancé directement avec Node.js. citeturn0search0

---

# 2. Prérequis

## 2.1. Côté GitHub

Il faut :

- un compte GitHub ;
- un dépôt GitHub ;
- une application AstroJS ;
- une branche `main`.

Exemple :

Reprendre notre application Scolarité dans VS Code associé au dépot GitHub :

```text
https://github.com/<votre-compte>/astro-scolarite-sqlite
```

Le dépôt doit contenir notamment :

```text
mon-application/
├── src/
├── public/
├── package.json
├── package-lock.json
├── astro.config.mjs
└── ...
```

## 2.2. Côté serveur

Le serveur Ubuntu doit disposer de :

- Git ;
- bun ou nodejs/npm ;
- Apache ou Nginx si nécessaire ;

---

# 3. Principe du déploiement

Le workflow est le suivant.


```text
GitHub
  │
  │ SSH
  ▼
serveur Ubuntu
  │
  ├── git pull
  ├── bun ci
  ├── bun run --bun build
  └── systemctl restart mon-app
```

Ainsi, le serveur possèdera toujours :

```text
code source
+
node_modules
+
build Astro
```

---

# 5. Préparer le serveur Ubuntu

Vérifier que git est bien installé :

```bash
git --version
```
Vérifier que bun est bien installé :

```bash
bun --version
```

> ** Il est recommandé d'utiliser la même version majeure de bun sur les environnements de développement et de production. **

---

# 6. Créer l'utilisateur de déploiement

Donnez/Vérifiez que le répertoire de l'application est bien la propriété de votre compte utilisateur Ubuntu (etudiant):

```bash
sudo chown -R etudiant:etudiant /var/www/scolarite/astro-scolarite-sqlite
```

---

# 7. Configurer l'accès SSH pour GitHub Actions

GitHub Actions doit pouvoir exécuter des commandes sur votre machine Ubuntu.

Le principe est :

```text
GitHub Actions
       │
       │ clé privée SSH
       ▼
Serveur Ubuntu
       │
       └── /home/etudiant/.ssh/authorized_keys
```

## 8. Générer une clé

Sur votre serveur VPS créer une paire da clé de sécurité sur votre dossier HOME:

```bash
cd ~/.ssh
ssh-keygen -t ed25519 -f "scolarite-key"
```

Deux fichiers sont générés :

```text
scolarite-key
scolarite-key.pub
```

La clé privée (sans extension de fichier) :

```text
scolarite-key
```

doit rester secrète.

---

# 9. Installer la clé publique sur Ubuntu

Afficher la clé publique :

```bash
cat scolarite-key.pub
```

Ajoutez la clé public dans les authorized_keys pour quelle soit utilisable :

```bash
cat scolarire-key.pub >> ~/.ssh/authorized_keys
```


---

# 10. Cloner le dépôt GitHub sur le serveur

L'application scolarité est déjà cloné dans le dossier /var/www/scolarite/astro-scolarite-sqlite (TP précédent)

> ** A ce stade normalement l'application est déjà fonctionnelle sur le VPS. Autrement dit un premier build et lancement ont déjà été effectué manuellement pour vérifier la conformité des installation coté serveur. **



---

# 11. Configurer les secrets GitHub

Dans votre GitHub :

```text
GitHub
→ Dépôt astro-scolarite-sqlite 
→ Settings
→ Secrets and variables
→ Actions
```

Créer :

| Secret | Valeur |
|---|---|
| `SSH_HOST` | 185.157.244.202 |
| `SSH_USER` | `etudiant` |
| `SSH_PORT` | `23<xxx>` |
| `SSH_PRIVATE_KEY` | <copier-coller tout le contenu de scolarite-key> |

La clé privée doit permettre à GitHub Actions de se connecter au compte `etudiant`.

Puis allez sur le menu utilisateur de GitHub (bouton en haut à gauche)
```text
GitHub
→ Settings
→ SSH and GPG Keys
→ New SSH key
→ donnez un titre "mon VPS" et copiez la clé public ~/.ssh/scolarite-key.pub 
``` 

> ** Cette action permet de donner les droit d'accès à votre dépot github depuis votre VPS même si le dépôt est privé. **

---

# 12. Autoriser le redémarrage systemd

L'utilisateur `etudiant` doit pouvoir redémarrer (action administrateur) en mode sudo l'application scolarite sans que son mot de passe lui soit demandé (difficile à faire si on est une action GitHub).

Créer :

```bash
sudo visudo -f /etc/sudoers.d/etudiant
```

Ajouter :

```text
etudiant ALL=(root) NOPASSWD: /bin/systemctl restart scolarite
etudiant ALL=(root) NOPASSWD: /bin/systemctl status scolarite
```

Tester :

```bash
sudo systemctl status scolarite
```
Le mot de passe n'est plus demandé à l'utilisateur etudiant pour redémarer le service scolarite.

---

# 13. Créer le workflow GitHub Actions

A partir de VS Code sur la machine de Dev, ajouter à la racine du projet astro-scolarite-sqlite l'arborescence suivante :

```text
.github/
└── workflows/
    └── deploy.yml
```

Dans deploy.yml copiez le contenu suivant :

```yaml
name: Deploy AstroJS

on:
  push:
    branches:
      - main

  workflow_dispatch:

jobs:

  deploy:

    runs-on: ubuntu-latest

    steps:

      - name: Deploy on Ubuntu server
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}

          script: |
            set -e

            echo "======================================"
            echo "Début du déploiement"
            echo "======================================"

            cd /var/www/scolarite/astro-scolarite-sqlite

            echo "Mise à jour du code..."
            git pull origin
            
            echo "Installation des dépendances..."
            bun ci

            echo "Compilation Astro..."
            bun run --bun build

            echo "Redémarrage de l'application..."
            sudo systemctl restart scolarite

            echo "Vérification du service..."
            sudo systemctl status scolarite

            echo "Health check..."
            curl --fail http://localhost:3000/

            echo "======================================"
            echo "Déploiement terminé"
            echo "======================================"
```

---

Le fonctionnement est donc :

```text
GitHub
   │
   │ push
   ▼
origin/main
   │
   │ git fetch
   ▼
Serveur
   │
   │ git reset --hard origin/main
   ▼
Code source à jour
```

---

# 14. Test complet d'un déploiement

Testons le fonctionnement de notre canal CI/CD. 

Sur votre machine de développement :

Dans VS Code modifiez le titre dans la 3 ligne de code du fichier ./src/layouts/Layout.astro

Puis versionnez la modification
```bash
git add .
git commit -m "changement de titre"
git push origin main
```

GitHub Actions est déclenché ?!

# 15. Evaluation
Validez le déploiement automatique de la nouvelle version de l'application