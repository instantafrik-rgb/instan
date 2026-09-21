import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Cable,
  Terminal,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'usb' | 'webapk'>(() => {
    // If user is directly on Android or mobile, default to direct install (WebAPK)
    if (typeof window !== 'undefined' && (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent))) {
      return 'webapk';
    }
    return 'webapk';
  });
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBat = () => {
    const batContent = `@echo off
REM ==========================================================
REM NANTOR SOURCING APP — INSTALLATION USB DEBUGGING (WINDOWS)
REM ==========================================================
title Nantor Sourcing App - Installation USB Android

echo =========================================================
echo    NANTOR SOURCING APP : INSTALLATION VIA DEBOGAGE USB
echo =========================================================
echo.

where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] ADB (Android Debug Bridge) n'est pas installe ou non present dans le PATH.
    echo Telechargez les outils Android Platform-Tools :
    echo https://developer.android.com/tools/releases/platform-tools
    pause
    exit /b 1
)

echo [1/4] Recherche du smartphone connecte en USB...
adb devices
echo.

echo Assurez-vous que votre telephone affiche 'device' et non 'unauthorized'.
echo Validez l'autorisation 'Autoriser le debogage USB' sur l'ecran du telephone si demande.
echo.
pause

echo [2/4] Compilation des assets...
call npm run build
if %errorlevel% neq 0 (
    echo Erreur lors du build.
    pause
    exit /b 1
)

echo [3/4] Synchronisation Capacitor Android...
call npx cap sync android

echo [4/4] Compilation et installation sur votre telephone via USB...
call npx cap run android

echo.
echo =========================================================
echo    APPLICATION INSTALLEE AVEC SUCCES SUR VOTRE SMARTPHONE
echo =========================================================
pause
`;
    downloadFile('install-usb.bat', batContent, 'application/x-bat');
  };

  const handleDownloadSh = () => {
    const shContent = `#!/bin/bash
# ==========================================================
# NANTOR SOURCING APP — INSTALLATION USB DEBUGGING VIA ADB
# ==========================================================
echo "=== NANTOR SOURCING APP: INSTALLATION VIA DÉBOGAGE USB ==="
echo ""

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

echo "[2/4] Compilation des assets web..."
npm run build

echo "[3/4] Synchronisation avec le projet Android natif..."
npx cap sync android

echo "[4/4] Déploiement et lancement sur votre smartphone Android..."
npx cap run android

echo ""
echo "=== INSTALLATION TERMINÉE AVEC SUCCÈS SUR VOTRE TÉLÉPHONE ! ==="
`;
    downloadFile('install-usb.sh', shContent, 'application/x-sh');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0d0d0e] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-neutral-900 dark:text-white">
        {/* Header - Minimalist High Contrast */}
        <div className="bg-neutral-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">
                  Installer l'application sur Android
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Android & WebAPK
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Installation directe autonome, hors-ligne et synchronisée V4
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('webapk')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'webapk'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Installation Directe Android (WebAPK)
          </button>
          <button
            onClick={() => setActiveTab('usb')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'usb'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
            }`}
          >
            <Cable className="w-4 h-4" />
            Débogage USB & PC (ADB)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {activeTab === 'usb' ? (
            <div className="space-y-4">
              {/* Prerequisite Box */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  <Smartphone className="w-4 h-4" />
                  Étape 1 : Activer le Débogage USB sur votre téléphone Android
                </div>
                <ol className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 list-decimal list-inside">
                  <li>Allez dans <strong>Paramètres</strong> &gt; <strong>À propos du téléphone</strong>.</li>
                  <li>Touchez <strong>7 fois</strong> sur <strong>« Numéro de build »</strong> pour débloquer le menu développeur.</li>
                  <li>Revenez dans <strong>Système</strong> &gt; <strong>Options pour les développeurs</strong> et activez <strong>« Débogage USB »</strong>.</li>
                  <li>Reliez votre téléphone à votre ordinateur avec votre <strong>câble USB</strong>.</li>
                  <li>Sur l'écran du téléphone, cochez <em>« Toujours autoriser cet ordinateur »</em> et appuyez sur <strong>Autoriser</strong>.</li>
                </ol>
              </div>

              {/* Method A: Chrome Remote Debugging (Instantaneous, No toolchains needed) */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-white">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-mono">A</span>
                    Méthode Rapide : Chrome Remote USB (Sans compilation)
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    Recommandé (30s)
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Votre navigateur Chrome sur PC peut envoyer et installer directement l'application sur votre téléphone branché en USB :
                </p>
                <div className="p-2.5 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-between font-mono text-xs">
                  <span className="text-neutral-800 dark:text-neutral-200 select-all">chrome://inspect/#devices</span>
                  <button
                    onClick={() => handleCopy('chrome://inspect/#devices', 'chrome-url')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition"
                  >
                    {copiedIndex === 'chrome-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === 'chrome-url' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <ol className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400 list-decimal list-inside">
                  <li>Collez l'adresse ci-dessus dans un nouvel onglet Chrome sur votre ordinateur.</li>
                  <li>Votre modèle de téléphone apparaît sous <strong>« Remote Target »</strong>.</li>
                  <li>Dans le champ <em>Open tab with url</em>, entrez l'adresse de l'appli et cliquez sur <strong>Open</strong>.</li>
                  <li>L'application s'ouvre sur votre téléphone et vous pouvez cliquer sur <strong>« Installer »</strong> directement via le pont USB !</li>
                </ol>
              </div>

              {/* Method B: Native ADB & Android Studio (Capacitor) */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-white">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-mono">B</span>
                    Méthode Développeur : ADB CLI & Android Studio (Capacitor)
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 font-bold">
                    Projet /android inclus
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Le projet contient l'environnement natif Android complet configuré avec les permissions Caméra, Stockage et Stockage Room local.
                </p>

                {/* Command snippets */}
                <div className="space-y-2">
                  <div className="p-2.5 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs flex items-center justify-between">
                    <div>
                      <span className="text-neutral-500 select-none">$ </span>
                      <span>adb devices</span>
                    </div>
                    <button
                      onClick={() => handleCopy('adb devices', 'cmd-adb')}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                      title="Copier"
                    >
                      {copiedIndex === 'cmd-adb' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs flex items-center justify-between">
                    <div>
                      <span className="text-neutral-500 select-none">$ </span>
                      <span>npm run cap:run</span>
                    </div>
                    <button
                      onClick={() => handleCopy('npm run cap:run', 'cmd-run')}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                      title="Copier"
                    >
                      {copiedIndex === 'cmd-run' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs flex items-center justify-between">
                    <div>
                      <span className="text-neutral-500 select-none">$ </span>
                      <span>npm run cap:android</span>
                    </div>
                    <button
                      onClick={() => handleCopy('npm run cap:android', 'cmd-studio')}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                      title="Copier"
                    >
                      {copiedIndex === 'cmd-studio' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 1-Click Scripts Download */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={handleDownloadBat}
                    className="w-full sm:w-1/2 py-2 px-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition hover:opacity-90"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger script Windows (.bat)
                  </button>
                  <button
                    onClick={handleDownloadSh}
                    className="w-full sm:w-1/2 py-2 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Télécharger script Linux/Mac (.sh)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {installSuccess && (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl border border-neutral-300 dark:border-neutral-700 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Application installée avec succès sur votre appareil !</span>
                </div>
              )}

              {isInstalled && !installSuccess && (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-xl border border-neutral-300 dark:border-neutral-700 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>L'application est déjà installée sur cet appareil en mode autonome.</span>
                </div>
              )}

              {isInstallable && (
                <div className="p-4 rounded-xl bg-neutral-950 text-white border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Installation instantanée en 1 clic
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-mono">
                      Google WebAPK
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Votre navigateur supporte l'installation directe. Cliquez ci-dessous pour installer l'application immédiatement sur votre téléphone Android.
                  </p>
                  <button
                    onClick={handleDirectInstall}
                    className="w-full py-3 px-4 rounded-xl bg-white text-black hover:bg-neutral-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Installer l'application Android maintenant
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-neutral-50 dark:bg-neutral-900/40">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-neutral-900 dark:text-white" />
                  Installation autonome via Chrome Android
                </h4>
                <ol className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300 list-decimal list-inside">
                  <li>Ouvrez l'application dans <strong>Google Chrome</strong> sur votre smartphone.</li>
                  <li>Touchez le menu des <strong>trois points verticaux (⋮)</strong> en haut à droite.</li>
                  <li>Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
                  <li>L'application s'ouvre en plein écran sans barre d'adresse et fonctionne hors-ligne.</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end">
                <a
                  href={`https://www.pwabuilder.com?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs flex items-center gap-1.5 transition hover:opacity-90"
                >
                  Générer fichier APK brut (PWABuilder)
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-medium text-xs text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
