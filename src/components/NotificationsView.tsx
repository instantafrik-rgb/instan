import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  CreditCard,
  Package,
  Truck,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NotificationCategorie, NotificationItem, TabType } from '../types';

interface NotificationsViewProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenCommande?: (commandeId: string) => void;
  onOpenDevis?: (devisId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onNavigateTab,
  onOpenCommande,
  onOpenDevis,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    triggerTestNotification,
    parametres,
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: { label: string; value: string; icon: React.ElementType }[] = [
    { label: 'Toutes', value: 'all', icon: Bell },
    { label: 'Paiements', value: 'Paiements', icon: CreditCard },
    { label: 'Commandes', value: 'Commandes', icon: Package },
    { label: 'Logistique', value: 'Logistique', icon: Truck },
    { label: 'Devis', value: 'Devis', icon: FileSpreadsheet },
    { label: 'Rappels', value: 'Rappels', icon: Clock },
  ];

  const filteredNotifications = notifications.filter((item) => {
    if (filterType === 'unread' && item.read) return false;
    if (filterType === 'read' && !item.read) return false;
    if (selectedCategory !== 'all' && item.categorie !== selectedCategory) return false;
    return true;
  });

  const getCategoryIcon = (cat?: NotificationCategorie) => {
    switch (cat) {
      case 'Paiements':
        return CreditCard;
      case 'Commandes':
        return Package;
      case 'Logistique':
        return Truck;
      case 'Devis':
        return FileSpreadsheet;
      case 'Rappels':
      default:
        return Clock;
    }
  };

  const getPriorityBadge = (priorite?: string) => {
    switch (priorite) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
            URGENT
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            ATTENTION
          </span>
        );
      case 'success':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            SUCCÈS
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
            INFO
          </span>
        );
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markNotificationRead(notif.id);

    if (notif.cibleType === 'commande' && notif.cibleId && onOpenCommande) {
      onOpenCommande(notif.cibleId);
      return;
    }

    if (notif.cibleType === 'devis' && notif.cibleId && onOpenDevis) {
      onOpenDevis(notif.cibleId);
      return;
    }

    if (notif.lienTab) {
      onNavigateTab(notif.lienTab);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card with quick actions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1422] border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Centre de Notifications
              </h2>
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-xs">
                  {unreadNotificationsCount} non lue{unreadNotificationsCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Alertes automatiques locales pour paiements, transit Chine-Togo et devis
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={triggerTestNotification}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-950/30 transition cursor-pointer"
            title="Tester le son et la vibration"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tester l’alerte</span>
          </button>

          {unreadNotificationsCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout lire</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="p-2 rounded-xl text-xs text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              title="Supprimer toutes les notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Category Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Read status toggles */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-[#0e1422] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterType === 'unread'
                  ? 'bg-white dark:bg-[#0e1422] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
              }`}
            >
              Non lues ({unreadNotificationsCount})
            </button>
            <button
              onClick={() => setFilterType('read')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterType === 'read'
                  ? 'bg-white dark:bg-[#0e1422] text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
              }`}
            >
              Lues ({notifications.length - unreadNotificationsCount})
            </button>
          </div>

          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono hidden sm:inline">
            Local Android & PWA Ready
          </span>
        </div>

        {/* Categories horizontal list */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs dark:bg-cyan-600'
                    : 'bg-white dark:bg-[#0e1422] text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-[#0e1422] border border-neutral-200/80 dark:border-neutral-800">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Aucune notification pour le moment
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {filterType === 'unread'
                ? 'Toutes les alertes ont été traitées ou marquées comme lues.'
                : 'Les notifications apparaîtront automatiquement lors des arrivages, règlements ou devis en attente.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const CatIcon = getCategoryIcon(notif.categorie);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-white/60 dark:bg-[#0e1422]/60 border-neutral-200/60 dark:border-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                    : 'bg-white dark:bg-[#0e1422] border-blue-500/30 dark:border-cyan-500/30 shadow-xs ring-1 ring-blue-500/10 text-neutral-900 dark:text-white'
                } hover:border-blue-500/50 dark:hover:border-cyan-500/50`}
              >
                <div className="flex items-start gap-3">
                  {/* Category icon with unread badge */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        notif.read
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                          : 'bg-blue-500/10 text-blue-600 dark:bg-cyan-500/10 dark:text-cyan-400'
                      }`}
                    >
                      <CatIcon className="w-4.5 h-4.5" />
                    </div>
                    {!notif.read && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-cyan-400 ring-2 ring-white dark:ring-[#0e1422]"></span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs sm:text-sm">
                          {notif.titre}
                        </span>
                        {getPriorityBadge(notif.priorite || notif.type)}
                      </div>
                      <span className="text-[11px] text-neutral-400 shrink-0 font-mono">
                        {formatDate(notif.date)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Footer link trigger */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px]">
                      <span className="text-neutral-400 flex items-center gap-1 font-medium">
                        {notif.categorie || 'Alerte Système'}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-cyan-400 font-medium flex items-center gap-1 hover:underline">
                          Ouvrir la fiche <ExternalLink className="w-3 h-3" />
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                          title="Supprimer la notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reminder on local Android notification settings */}
      {!parametres.notificationsEnabled && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Les notifications sont actuellement désactivées dans vos Paramètres. Vous pouvez les réactiver à tout moment.
          </span>
        </div>
      )}
    </div>
  );
};
