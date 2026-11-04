import { Suspense } from "react";
import { CalendarRange, ClipboardList, ShieldCheck } from "lucide-react";
import { connection } from "next/server";

import { AdminLogoutButton } from "@/components/admin-logout-button";
import { AdminBookings } from "@/components/admin-bookings";
import { AdminRealisations } from "@/components/admin-realisations";
import { AdminRentalCatalogue } from "@/components/admin-rental-catalogue";
import { AdminQuoteInbox } from "@/components/admin-quote-inbox";
import { AdminBookingListError, getAdminBookingList } from "@/lib/admin-bookings";
import { AdminQuoteInboxError, getAdminQuoteInbox } from "@/lib/admin-quotes";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-busy="true">
          <p className="text-sm text-muted">Chargement de l’espace sécurisé…</p>
        </main>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  await connection();
  let inbox;
  let bookingData;
  try {
    bookingData = await getAdminBookingList();
    inbox = await getAdminQuoteInbox();
  } catch (error) {
    if (!(error instanceof AdminQuoteInboxError) && !(error instanceof AdminBookingListError)) {
      throw error;
    }

    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-red-200 bg-white p-6">
          <h1 className="font-serif text-3xl text-foreground">Espace indisponible</h1>
          <p className="mt-2 text-sm text-muted">
            Impossible de charger les devis pour le moment. Vérifiez la connexion à la base de
            données, puis actualisez la page.
          </p>
        </div>
      </main>
    );
  }

  const stats = [
    { label: "Devis à traiter", value: inbox.counts.review, icon: ClipboardList },
    { label: "Devis approuvés", value: inbox.counts.approved, icon: ShieldCheck },
    { label: "Réservations actives", value: inbox.counts.activeBookings, icon: CalendarRange },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-gold">Admin</p>
          <h1 className="mt-3 font-serif text-5xl text-foreground">Tableau de bord</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[rgba(214,163,77,0.2)] bg-[rgba(214,163,77,0.08)] px-4 py-2 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 text-gold" />
            Accès administrateur
          </div>
          <AdminLogoutButton />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-[1.6rem] border border-line bg-white p-5 shadow-[0_18px_40px_rgba(8,7,6,0.04)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{label}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,163,77,0.12)] text-gold">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-6 text-4xl font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Location</p>
          <h2 className="mt-2 font-serif text-4xl text-foreground">Catalogue de location</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Gérez les articles visibles dans la collection publique, leurs tarifs, stocks et photographies.
          </p>
        </div>
        <AdminRentalCatalogue />
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Portfolio</p>
          <h2 className="mt-2 font-serif text-4xl text-foreground">Réalisations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Ajoutez vos projets avec leur photographie, leur titre et une courte description. Les
            projets publiés apparaissent avec les six réalisations historiques sur la page d’accueil.
          </p>
        </div>
        <AdminRealisations />
      </section>

      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Demandes clients</p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">Boîte de devis</h2>
          </div>
          <p className="text-sm text-muted">Les 50 demandes les plus récentes</p>
        </div>
        <AdminQuoteInbox quotes={inbox.quotes} />
      </section>

      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Planning</p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">Réservations</h2>
          </div>
          <p className="text-sm text-muted">Les 100 réservations les plus récentes</p>
        </div>
        <AdminBookings
          key={`${bookingData.bookings
            .map((booking) => `${booking.id}:${booking.updatedAt}:${booking.payment?.id ?? ""}:${booking.payment?.status ?? ""}`)
            .join(",")}:${inbox.quotes
            .filter((quote) => quote.status === "approved")
            .map((quote) => quote.id)
            .join(",")}`}
          bookings={bookingData.bookings}
          approvedQuotes={inbox.quotes
            .filter(
              (quote) =>
                quote.status === "approved" &&
                !bookingData.bookings.some((booking) => booking.quoteId === quote.id),
            )
            .map((quote) => ({
              id: quote.id,
              reference: quote.reference,
              eventType: quote.eventType,
              eventDate: quote.eventDate,
              customer: quote.customer,
            }))}
        />
      </section>
    </main>
  );
}
