"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useState } from "react";
import { Protected } from "@/components/layout/Protected";
import { AddressBook } from "@/features/profile/AddressBook";
import { ConsentsPanel } from "@/features/profile/ConsentsPanel";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { SecurityPanel } from "@/features/profile/SecurityPanel";
import { WishlistPanel } from "@/features/profile/WishlistPanel";

type TabId = "profile" | "addresses" | "wishlist" | "consents" | "security";

export function ProfilePage() {
  const { t } = useI18n();
  const TABS = [
    { id: "profile", label: t("profile.tabProfile") },
    { id: "addresses", label: t("profile.tabAddresses") },
    { id: "wishlist", label: t("profile.tabWishlist") },
    { id: "consents", label: t("profile.tabConsents") },
    { id: "security", label: t("profile.tabSecurity") }
  ] as const;
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <Protected>
      <main className="page">
        <h1 className="title" style={{ marginBottom: 20 }}>
          {t("profile.myAccountTitle")}
        </h1>
        <div className="chipRow">
          {TABS.map((item) => (
            <button key={item.id} className="chip" data-selected={item.id === tab} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <section className="section">
          {tab === "profile" ? <ProfileForm /> : null}
          {tab === "addresses" ? <AddressBook /> : null}
          {tab === "wishlist" ? <WishlistPanel /> : null}
          {tab === "consents" ? <ConsentsPanel /> : null}
          {tab === "security" ? <SecurityPanel /> : null}
        </section>
      </main>
    </Protected>
  );
}
