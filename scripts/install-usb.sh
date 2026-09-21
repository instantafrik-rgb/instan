#!/bin/bash
# ==========================================================
# NANTOR SOURCING APP — INSTALLATION USB DEBUGGING VIA ADB
# ==========================================================
echo "=== NANTOR SOURCING APP: INSTALLATION VIA DÉBOGAGE USB ==="
echo ""

# Vérifier si ADB est installé
if ! command -v adb &> /dev/null
then
    echo "[!] ADB (Android Debug Bridge) n'est pas détecté dans votre PATH."
    echo "    Veuillez installer Android Studio ou les Platform-Tools Android:"
    echo "    https://developer.android.com/tools/releases/platform-tools"
    exit 1
fi

echo "[1/4] Détection de votre smartphone Android branché en USB..."
adb devices -l
echo ""

DEVICES_COUNT=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES_COUNT" -eq 0 ]; then
    echo "[!] Aucun appareil Android détecté avec le débogage USB activé."
    echo "    Assurez-vous de :"
    echo "    1. Activer 'Options pour développeurs' (Paramètres > À propos > 7 clics sur 'Numéro de build')."
    echo "    2. Activer 'Débogage USB' dans les options pour développeurs."
    echo "    3. Valider l'autorisation sur l'écran du smartphone ('Toujours autoriser cet ordinateur')."
    exit 1
fi

echo "[2/4] Compilation des assets web..."
npm run build

echo "[3/4] Synchronisation avec le projet Android natif..."
npx cap sync android

echo "[4/4] Déploiement et lancement sur votre smartphone Android..."
npx cap run android

echo ""
echo "=== INSTALLATION TERMINÉE AVEC SUCCÈS SUR VOTRE TÉLÉPHONE ! ==="
